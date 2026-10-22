import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { AuthProvider, useAuth } from "./AuthProvider";
import { readStudioConfig } from "./config";

function Probe() {
  const { status, email, getAccessToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    void getAccessToken().then(setToken);
  }, [getAccessToken]);
  return (
    <p>
      {status} {email} {token}
    </p>
  );
}

describe("AuthProvider in local mode", () => {
  it("is signed in as the local admin without contacting Cognito", async () => {
    const config = readStudioConfig({ DEV: true, MODE: "studio-local" });
    render(
      <AuthProvider config={config}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("signedIn admin@localhost local-dev")).toBeInTheDocument());
    expect(sessionStorage.length).toBe(0);
  });

  it("stays unconfigured in a build without the Studio variables", () => {
    render(
      <AuthProvider config={readStudioConfig({ DEV: false, MODE: "studio-local" })}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText(/^unconfigured/)).toBeInTheDocument();
  });
});
