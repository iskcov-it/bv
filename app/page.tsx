import { auth } from "@/auth";
import { SignInButtons } from "@/components/SignInButtons";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
              <Image src="/logo1.jpg" alt="ISKCON Coventry" width={84} height={84} style={{ borderRadius: 999, objectFit: "contain", border: "3px solid #e7caa3" }} />
              <div style={{ fontSize: 22, color: "#a44d39", fontWeight: 700 }}>हरे कृष्ण</div>
              <div className="label">Hari Bol</div>
            </div>
            <div className="label" style={{ marginTop: 8 }}>ISKCON</div>
            <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>Sadhana Chart</h1>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              Google sign-in, period reports, leader dashboard, and superadmin reporting for all devotees.
            </p>
          </div>

          {session?.user ? (
            <div className="grid">
              <div className="card" style={{ borderRadius: 18 }}>
                <div className="row">
                  <div>
                    <div style={{ fontWeight: 700 }}>{session.user.name}</div>
                    <div className="muted">{session.user.role}</div>
                  </div>
                  <div className="badge">Signed in</div>
                </div>
              </div>
              <Link className="btn orange" href="/dashboard">Open Dashboard</Link>
              <div className="muted" style={{ textAlign: "center" }}>You can sign out from the dashboard and sign in as another user.</div>
            </div>
          ) : (
            <SignInButtons />
          )}

          <div className="card" style={{ marginTop: 16, borderRadius: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Included roles</div>
            <div className="muted">• Devotee: can save daily entries and view own reports</div>
            <div className="muted">• Leader: can view reports for assigned devotees</div>
            <div className="muted">• Superadmin: can view reports for all devotees</div>
          </div>
        </div>
      </div>
    </main>
  );
}
