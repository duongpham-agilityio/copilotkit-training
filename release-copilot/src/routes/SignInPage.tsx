import { useAuth } from '@/hooks/use-auth.ts';
import Button, { ButtonVariant } from '@/components/common/Button.tsx';

const SignInPage = () => {
  const { signInWithOAuth } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-outline-variant p-6">
        <h1 className="text-headline-md">Sign in</h1>
        <div className="flex flex-col gap-3">
          <Button
            variant={ButtonVariant.Primary}
            onClick={() => void signInWithOAuth('github')}
          >
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
