"use client";

import { useState } from "react";
import { AuthCard } from "@/components/features/auth/components/auth-card";
import { GoogleSignInButton } from "@/components/features/auth/components/google-signin-button";
import { CredentialsForm } from "@/components/features/auth/components/credentials-form";
import { ErrorAlert } from "@/components/features/auth/components/error-alert";
import { Divider } from "@/components/features/auth/components/divider";
import { useTranslations } from "next-intl";

interface SignInFormProps {
  locale: string;
  callbackUrl?: string;
}

export function SignInForm({ locale, callbackUrl }: SignInFormProps) {
  const tAuth = useTranslations('auth');
  const tNav = useTranslations('navigation');
  const [error, setError] = useState("");
  
  const defaultCallbackUrl = callbackUrl || `/${locale}/dashboard`;

  return (
    <AuthCard
      title={tAuth('loginTitle')}
      description={tAuth('loginDescription')}
      footerText={tAuth('noAccount')}
      footerLinkText={tNav('signup')}
      footerLinkHref={`/${locale}/auth/signup`}
    >
      <ErrorAlert message={error} />
      <GoogleSignInButton callbackUrl={defaultCallbackUrl} />
      <Divider />
      <CredentialsForm callbackUrl={defaultCallbackUrl} onError={setError} />
    </AuthCard>
  );
}
