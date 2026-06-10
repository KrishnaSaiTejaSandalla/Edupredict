import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-xl p-6">
        <h1 className="text-2xl mb-4">Create an account</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
