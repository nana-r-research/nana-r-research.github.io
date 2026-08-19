import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="shell"><div className="page-heading"><p className="kicker">Repository administration</p><h1>管理画面にログイン</h1></div><SignIn routing="path" path="/sign-in" /></main>;
}
