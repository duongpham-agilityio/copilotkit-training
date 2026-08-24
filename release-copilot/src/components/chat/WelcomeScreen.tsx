import { Sparkles } from 'lucide-react';

const WelcomeScreen = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
    <span className="bg-primary text-on-primary mb-2 flex size-14 shrink-0 items-center justify-center rounded-2xl">
      <Sparkles className="size-7" />
    </span>
    <p className="text-headline-md text-on-surface">
      How can I help with your release notes?
    </p>
    <p className="text-body-md text-on-surface-variant max-w-[320px] leading-relaxed">
      Paste a git log or PR description in the app, then ask me to draft or
      refine release notes from the selected commits.
    </p>
  </div>
);

export default WelcomeScreen;
