'use server';

import { db } from './db';
import {
  chatMessages,
  users,
  parents,
  teachers,
  students,
  studentParents,
  classes,
  classSubjects,
  conversations,
  conversationParticipants,
} from './schema';
import { eq, ne, and, or, inArray, desc, sql, isNull } from 'drizzle-orm';
import { getCurrentUser } from './auth';
import { broadcastMessage } from './realtime';
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';

export async function uploadChatAttachment(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'chat');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = join(uploadsDir, uniqueName);
    await writeFile(filePath, buffer);

    return {
      url: `/uploads/chat/${uniqueName}`,
      fileName: file.name,
      mediaSize: file.size,
      mediaType: file.type,
    };
  } catch (err: any) {
    console.error('File upload failed:', err);
    throw new Error('File upload failed: ' + err.message);
  }
}

export type ChatContact = {
  id: number;
  name: string;
  role: string;
  profileImageUrl: string | null;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
};

/**
 * Validates whether two users are permitted to communicate based on role matrix:
 * Allowed:
 *  - Admin <-> Teacher
 *  - Teacher <-> Parent
 *  - Student <-> Student
 * Everything else is strictly blocked.
 */
export async function validateMessagePermission(
  senderUserId: number,
  receiverUserId: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (senderUserId === receiverUserId) {
    return { allowed: false, reason: 'Cannot message yourself.' };
  }

  const [sender] = await db
    .select({ id: users.id, role: users.role, schoolId: users.schoolId, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, senderUserId))
    .limit(1);

  const [receiver] = await db
    .select({ id: users.id, role: users.role, schoolId: users.schoolId, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, receiverUserId))
    .limit(1);

  if (!sender || !receiver || !sender.isActive || !receiver.isActive) {
    return { allowed: false, reason: 'User not found or inactive.' };
  }

  const sRole = (sender.role || '').toLowerCase();
  const rRole = (receiver.role || '').toLowerCase();

  // 1. Admin <-> Teacher
  if (
    (sRole === 'admin' && rRole === 'teacher') ||
    (sRole === 'teacher' && rRole === 'admin')
  ) {
    return { allowed: true };
  }

  // 2. Teacher <-> Parent
  if (
    (sRole === 'teacher' && rRole === 'parent') ||
    (sRole === 'parent' && rRole === 'teacher')
  ) {
    return { allowed: true };
  }

  // 3. Student <-> Student
  if (sRole === 'student' && rRole === 'student') {
    if (sender.schoolId && receiver.schoolId && sender.schoolId !== receiver.schoolId) {
      return {
        allowed: false,
        reason: 'Students from different schools cannot message each other.',
      };
    }
    return { allowed: true };
  }

  // Everything else is strictly blocked
  return {
    allowed: false,
    reason: `Forbidden: Messaging between ${sRole} and ${rRole} is not permitted.`,
  };
}

export async function findOrCreateConversation(userId1: number, userId2: number): Promise<number> {
  const perm = await validateMessagePermission(userId1, userId2);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden: Unauthorized conversation.');
  }

  const cp1 = db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId1))
    .as('cp1');

  const result = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .innerJoin(cp1, eq(conversationParticipants.conversationId, cp1.conversationId))
    .where(eq(conversationParticipants.userId, userId2))
    .limit(1);

  if (result.length > 0) {
    return result[0].conversationId;
  }

  // Create new conversation
  const [convResult] = await db.insert(conversations).values({});
  const conversationId = Number(convResult.insertId);

  // Add participants
  await db.insert(conversationParticipants).values([
    { conversationId, userId: userId1 },
    { conversationId, userId: userId2 },
  ]);

  // Backfill existing messages between these two users to reference this conversationId
  await db
    .update(chatMessages)
    .set({ conversationId })
    .where(
      and(
        isNull(chatMessages.conversationId),
        or(
          and(eq(chatMessages.senderId, userId1), eq(chatMessages.receiverId, userId2)),
          and(eq(chatMessages.senderId, userId2), eq(chatMessages.receiverId, userId1))
        )
      )
    );

  return conversationId;
}

export async function sendMessage(
  receiverId: number,
  message: string,
  attachmentUrl?: string,
  mediaType?: string,
  mediaSize?: number,
  fileName?: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (!message.trim() && !attachmentUrl) {
    throw new Error('Message content or attachment is required.');
  }

  // Check role permission
  const perm = await validateMessagePermission(user.id, receiverId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden: You are not authorized to message this user.');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, receiverId);

    const result = await db.insert(chatMessages).values({
      conversationId,
      senderId: user.id,
      receiverId,
      message: message.trim(),
      attachmentUrl: attachmentUrl || null,
      mediaType: mediaType || null,
      mediaSize: mediaSize || null,
      fileName: fileName || null,
      isRead: false,
    });

    const insertedId = Number(result[0].insertId);
    const [newMsg] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, insertedId))
      .limit(1);

    if (!newMsg) throw new Error('Failed to retrieve created message.');

    // Broadcast in real-time
    const sseConvId = [user.id, receiverId].sort((a, b) => a - b).join('-');
    broadcastMessage(sseConvId, newMsg);

    // Create database notification for the recipient
    try {
      const { createNotificationForUser } = await import('./notification-actions');
      const actionUrlMap: Record<string, string> = {
        student: `/student/messages`,
        teacher: `/teacher/messages`,
        parent: `/parent/messages`,
        admin: `/admin/messages`,
      };

      const [recUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, receiverId))
        .limit(1);

      const recRole = recUser?.role || 'student';
      const finalUrl = actionUrlMap[recRole] || `/student/messages`;

      await createNotificationForUser(
        receiverId,
        'New Message',
        `${user.name} sent you a message: "${message.trim().slice(0, 60)}${message.trim().length > 60 ? '...' : ''}"`,
        'messages',
        'low',
        finalUrl
      );
    } catch (notifErr) {
      console.error('Failed to create notification for message:', notifErr);
    }

    return newMsg;
  } catch (err: any) {
    console.error('Failed to send message:', err);
    throw new Error(err.message || 'Failed to send message.');
  }
}

export async function getMessages(otherUserId: number, limit: number = 50, offset: number = 0) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const perm = await validateMessagePermission(user.id, otherUserId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden: You are not authorized to view messages with this user.');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, otherUserId);

    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (err: any) {
    console.error('Failed to get messages:', err);
    throw new Error(err.message || 'Failed to retrieve messages.');
  }
}

export async function markMessagesRead(senderId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const perm = await validateMessagePermission(user.id, senderId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, senderId);

    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.senderId, senderId),
          eq(chatMessages.receiverId, user.id),
          eq(chatMessages.isRead, false)
        )
      );
    return { success: true };
  } catch (err: any) {
    console.error('Failed to mark messages read:', err);
    throw new Error(err.message || 'Failed to update read markers.');
  }
}

export async function clearConversation(otherUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const perm = await validateMessagePermission(user.id, otherUserId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, otherUserId);

    // Delete all messages in the conversation
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId));

    // Broadcast clear event
    const sseConvId = [user.id, otherUserId].sort((a, b) => a - b).join('-');
    broadcastMessage(sseConvId, { type: 'clear', conversationId, senderId: user.id });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to clear conversation:', err);
    throw new Error(err.message || 'Failed to clear conversation.');
  }
}

export async function deleteConversation(otherUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const perm = await validateMessagePermission(user.id, otherUserId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, otherUserId);

    // Delete all messages, participants, and conversation record
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId));

    await db
      .delete(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId));

    // Broadcast delete event
    const sseConvId = [user.id, otherUserId].sort((a, b) => a - b).join('-');
    broadcastMessage(sseConvId, { type: 'delete', conversationId, senderId: user.id });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete conversation:', err);
    throw new Error(err.message || 'Failed to delete conversation.');
  }
}

export async function getSharedMedia(otherUserId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const perm = await validateMessagePermission(user.id, otherUserId);
  if (!perm.allowed) {
    throw new Error(perm.reason || 'Forbidden');
  }

  try {
    const conversationId = await findOrCreateConversation(user.id, otherUserId);

    // Fetch all messages in this conversation that have attachments or mediaType
    const rows = await db
      .select({
        id: chatMessages.id,
        message: chatMessages.message,
        attachmentUrl: chatMessages.attachmentUrl,
        mediaType: chatMessages.mediaType,
        mediaSize: chatMessages.mediaSize,
        fileName: chatMessages.fileName,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          or(
            sql`${chatMessages.attachmentUrl} is not null`,
            sql`${chatMessages.mediaType} is not null`
          )
        )
      )
      .orderBy(desc(chatMessages.createdAt));

    return rows.map((r) => ({
      id: r.id,
      message: r.message,
      attachmentUrl: r.attachmentUrl,
      mediaType: r.mediaType || (r.attachmentUrl ? detectMediaType(r.attachmentUrl) : 'document'),
      mediaSize: r.mediaSize ?? 0,
      fileName: r.fileName || (r.attachmentUrl ? r.attachmentUrl.split('/').pop() : 'Attachment'),
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err: any) {
    console.error('Failed to retrieve shared media:', err);
    return [];
  }
}

function detectMediaType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'ogg'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) return 'audio';
  return 'document';
}

export async function getChatRecipients(): Promise<ChatContact[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  try {
    let rawRecipients: { id: number; name: string; role: string; profileImageUrl: string | null }[] = [];

    const userRole = (user.role || '').toLowerCase();

    if (userRole === 'admin') {
      // Admin <-> Teacher ONLY. (Admin <-> Parent is blocked).
      const teacherRecipients = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
        })
        .from(users)
        .innerJoin(teachers, eq(users.id, teachers.userId))
        .where(
          and(
            eq(users.isActive, true),
            user.school?.id ? eq(teachers.schoolId, user.school.id) : undefined
          )
        );

      rawRecipients = teacherRecipients;
    } else if (userRole === 'teacher') {
      // Teacher <-> Admin AND Teacher <-> Parent
      const [admins, teacherRows] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(
            and(
              eq(users.role, 'admin'),
              eq(users.isActive, true),
              user.school?.id ? eq(users.schoolId, user.school.id) : undefined
            )
          ),
        db
          .select({ id: teachers.id, schoolId: teachers.schoolId })
          .from(teachers)
          .where(eq(teachers.userId, user.id))
          .limit(1),
      ]);
      const teacherRow = teacherRows[0];

      if (teacherRow) {
        // Find class IDs where they are class teacher or teach subjects
        const [classTeacherClasses, subjectClasses] = await Promise.all([
          db
            .select({ id: classes.id })
            .from(classes)
            .where(eq(classes.classTeacherId, teacherRow.id)),
          db
            .select({ classId: classSubjects.classId })
            .from(classSubjects)
            .where(eq(classSubjects.teacherId, teacherRow.id)),
        ]);

        const classIds = Array.from(
          new Set([
            ...classTeacherClasses.map((c) => c.id),
            ...subjectClasses.map((c) => c.classId),
          ])
        );

        let parentRecipients: { id: number; name: string; role: string; profileImageUrl: string | null }[] = [];

        if (classIds.length > 0) {
          const studentRows = await db
            .select({ id: students.id })
            .from(students)
            .where(inArray(students.classId, classIds));

          const studentIds = studentRows.map((s) => s.id);

          if (studentIds.length > 0) {
            const parentRows = await db
              .select({ parentId: studentParents.parentId })
              .from(studentParents)
              .where(inArray(studentParents.studentId, studentIds));

            const parentIds = Array.from(new Set(parentRows.map((p) => p.parentId)));

            if (parentIds.length > 0) {
              parentRecipients = await db
                .select({
                  id: users.id,
                  name: users.name,
                  role: users.role,
                  profileImageUrl: users.profileImageUrl,
                })
                .from(users)
                .innerJoin(parents, eq(users.id, parents.userId))
                .where(and(inArray(parents.id, parentIds), eq(users.isActive, true)));
            }
          }
        }
        rawRecipients = [...admins, ...parentRecipients];
      } else {
        rawRecipients = admins;
      }
    } else if (userRole === 'parent') {
      // Parent <-> Teacher ONLY. (Parent <-> Admin is blocked).
      const [parentRow] = await db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.userId, user.id))
        .limit(1);

      if (parentRow) {
        const childRelations = await db
          .select({ studentId: studentParents.studentId })
          .from(studentParents)
          .where(eq(studentParents.parentId, parentRow.id));

        const studentIds = childRelations.map((c) => c.studentId);

        let teacherRecipients: { id: number; name: string; role: string; profileImageUrl: string | null }[] = [];

        if (studentIds.length > 0) {
          const studentClasses = await db
            .select({ classId: students.classId })
            .from(students)
            .where(inArray(students.id, studentIds));

          const classIds = Array.from(new Set(studentClasses.map((sc) => sc.classId)));

          if (classIds.length > 0) {
            const [classTeachers, subjectTeachers] = await Promise.all([
              db
                .select({ teacherId: classes.classTeacherId })
                .from(classes)
                .where(inArray(classes.id, classIds)),
              db
                .select({ teacherId: classSubjects.teacherId })
                .from(classSubjects)
                .where(inArray(classSubjects.classId, classIds)),
            ]);

            const teacherIds = Array.from(
              new Set([
                ...classTeachers.map((ct) => ct.teacherId).filter(Boolean) as number[],
                ...subjectTeachers.map((st) => st.teacherId),
              ])
            );

            if (teacherIds.length > 0) {
              teacherRecipients = await db
                .select({
                  id: users.id,
                  name: users.name,
                  role: users.role,
                  profileImageUrl: users.profileImageUrl,
                })
                .from(users)
                .innerJoin(teachers, eq(users.id, teachers.userId))
                .where(and(inArray(teachers.id, teacherIds), eq(users.isActive, true)));
            }
          }
        }
        rawRecipients = teacherRecipients;
      }
    } else if (userRole === 'student') {
      // Student <-> Student ONLY (fellow students at same school)
      const [studentRow] = await db
        .select({ id: students.id, schoolId: students.schoolId })
        .from(students)
        .where(eq(students.userId, user.id))
        .limit(1);

      if (studentRow) {
        const fellowStudents = await db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .innerJoin(students, eq(users.id, students.userId))
          .where(
            and(
              eq(users.role, 'student'),
              eq(users.isActive, true),
              eq(students.schoolId, studentRow.schoolId),
              ne(users.id, user.id)
            )
          );

        rawRecipients = fellowStudents;
      }
    } else {
      // Driver or other roles -> NO authorized messaging
      rawRecipients = [];
    }

    const contactIds = rawRecipients.map((r) => r.id);
    if (contactIds.length === 0) return [];

    // Fetch unread counts
    const unreadRows = await db
      .select({
        senderId: chatMessages.senderId,
        unreadCount: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .where(and(eq(chatMessages.receiverId, user.id), eq(chatMessages.isRead, false)))
      .groupBy(chatMessages.senderId);

    const unreadMap: Record<number, number> = {};
    unreadRows.forEach((row) => {
      unreadMap[row.senderId] = Number(row.unreadCount);
    });

    // 1. Fetch all conversations user.id is participant in, along with the other participant's user ID
    const myConvs = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        otherUserId: conversationParticipants.userId,
      })
      .from(conversationParticipants)
      .where(
        and(
          inArray(
            conversationParticipants.conversationId,
            db
              .select({ conversationId: conversationParticipants.conversationId })
              .from(conversationParticipants)
              .where(eq(conversationParticipants.userId, user.id))
          ),
          ne(conversationParticipants.userId, user.id)
        )
      );

    const convMap: Record<number, number> = {};
    myConvs.forEach((c) => {
      convMap[c.otherUserId] = c.conversationId;
    });

    const activeConversationIds = Array.from(new Set(myConvs.map((c) => c.conversationId)));

    // Fetch last message for each conversation in a single query
    const lastMessages =
      activeConversationIds.length > 0
        ? await db
            .select({
              conversationId: chatMessages.conversationId,
              message: chatMessages.message,
              createdAt: chatMessages.createdAt,
            })
            .from(chatMessages)
            .where(
              and(
                inArray(chatMessages.conversationId, activeConversationIds),
                sql`${chatMessages.createdAt} = (
                  select max(m2.created_at) 
                  from chat_messages m2 
                  where m2.conversation_id = chat_messages.conversation_id
                )`
              )
            )
        : [];

    const lastMsgMap: Record<number, { message: string; createdAt: Date }> = {};
    lastMessages.forEach((m) => {
      if (m.conversationId) {
        lastMsgMap[m.conversationId] = {
          message: m.message,
          createdAt: m.createdAt,
        };
      }
    });

    const contacts: ChatContact[] = rawRecipients.map((r) => {
      const conversationId = convMap[r.id];
      const lastMsg = conversationId ? lastMsgMap[conversationId] : undefined;

      return {
        ...r,
        unreadCount: unreadMap[r.id] || 0,
        lastMessage: lastMsg ? lastMsg.message : undefined,
        lastMessageAt: lastMsg ? lastMsg.createdAt.toISOString() : undefined,
      };
    });

    // Sort: contacts with latest messages first
    return contacts.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  } catch (err: any) {
    console.error('Failed to get chat recipients:', err);
    return [];
  }
}

export async function deleteMessage(messageId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  try {
    const [msg] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!msg) throw new Error('Message not found');

    if (msg.senderId !== user.id && msg.receiverId !== user.id) {
      throw new Error('Unauthorized');
    }

    await db.delete(chatMessages).where(eq(chatMessages.id, messageId));

    const sseConvId = [msg.senderId, msg.receiverId].sort((a, b) => a - b).join('-');
    broadcastMessage(sseConvId, { type: 'delete-message', messageId });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete message:', err);
    throw new Error(err.message || 'Failed to delete message.');
  }
}
