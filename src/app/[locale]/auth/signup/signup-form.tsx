"use client";

import { useState } from "react";
import { AuthCard } from "@/components/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/components/features/auth/components/google-signin-button";
import { SignUpForm } from "@/components/features/auth/components/signup-form";
import { ErrorAlert } from "@/components/features/auth/components/error-alert";
import { Divider } from "@/components/features/auth/components/divider";
import { useTranslations } from "next-intl";

interface SignUpFormComponentProps {
  locale: string;
  callbackUrl?: string;
}

export function SignUpFormComponent({ locale, callbackUrl }: SignUpFormComponentProps) {
  const tAuth = useTranslations('auth');
  const tNav = useTranslations('navigation');
  const [error, setError] = useState("");
  
  const defaultCallbackUrl = callbackUrl || `/${locale}/dashboard`;

  return (
    <AuthCard
      title={tAuth('signupTitle')}
      description={tAuth('signupDescription')}
      footerText={tAuth('hasAccount')}
      footerLinkText={tNav('login')}
      footerLinkHref={`/${locale}/auth/signin`}
    >
      <ErrorAlert message={error} />
      <GoogleSignInButton callbackUrl={defaultCallbackUrl} text={tAuth('signupWithGoogle')} />
      <Divider />
      <SignUpForm callbackUrl={defaultCallbackUrl} onError={setError} />
    </AuthCard>
  );
}
