import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <div className="authLayout">
      <div className="authFormPanel">
        <div className="authCard">
          <div className="skeleton skeletonLine" style={{ width: "40%", height: 28 }} />
          <div className="skeleton skeletonLine" style={{ width: "70%", marginTop: 16 }} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
