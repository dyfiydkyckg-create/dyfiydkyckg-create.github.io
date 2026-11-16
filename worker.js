const SITE = "https://dyfiydkyckg-create.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;
    const cookieName = "gh_follow_session";
    const cookie = request.headers.get("Cookie") || "";
    const session = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(cookieName + "="))?.split("=").slice(1).join("=");

    const headers = new Headers({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    });
    if (request.method === "OPTIONS") {
      headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/login") {
      const state = crypto.randomUUID();
      const auth = new URL("https://github.com/login/oauth/authorize");
      auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      auth.searchParams.set("redirect_uri", origin + "/callback");
      auth.searchParams.set("scope", "user:follow");
      auth.searchParams.set("state", state);
      headers.set("Set-Cookie", "gh_follow_state=" + state + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600");
      headers.set("Location", auth.toString());
      return new Response(null, { status: 302, headers });
    }

    if (url.pathname === "/callback") {
      const stateCookie = cookie.split(";").map(x => x.trim()).find(x => x.startsWith("gh_follow_state="))?.split("=")[1];
      const code = url.searchParams.get("code");
      if (!code || !stateCookie || stateCookie !== url.searchParams.get("state")) {
        return new Response("OAuth state validation failed. Return to the app and try again.", { status: 400 });
      }
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: origin + "/callback" })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response("GitHub sign-in failed: " + (tokenData.error_description || tokenData.error || "unknown error"), { status: 400 });
      }
      headers.set("Set-Cookie", cookieName + "=" + encodeURIComponent(tokenData.access_token) + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800");
      headers.append("Set-Cookie", "gh_follow_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
      headers.set("Location", origin + "/");
      return new Response(null, { status: 302, headers });
    }

    if (url.pathname === "/logout" && request.method === "POST") {
      headers.set("Set-Cookie", cookieName + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
      return new Response(JSON.stringify({ ok: true }), { headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" } });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!session) return Response.json({ error: "Not connected. Sign in again." }, { status: 401, headers });
      let path = "";
      if (url.pathname === "/api/me/following") path = "/user/following?per_page=100&page=" + (url.searchParams.get("page") || "1");
      else if (url.pathname === "/api/target/following") path = "/users/ancaferro/following?per_page=100&page=" + (url.searchParams.get("page") || "1");
      else if (url.pathname.startsWith("/api/follow/") && request.method === "PUT") {
        const login = decodeURIComponent(url.pathname.slice("/api/follow/".length));
        if (!/^[a-zA-Z0-9-]{1,39}$/.test(login)) return Response.json({ error: "Invalid username" }, { status: 400, headers });
        path = "/user/following/" + encodeURIComponent(login);
      } else return Response.json({ error: "Unknown endpoint" }, { status: 404, headers });

      const gh = await fetch("https://api.github.com" + path, {
        method: request.method === "PUT" ? "PUT" : "GET",
        headers: { "Accept": "application/vnd.github+json", "Authorization": "Bearer " + decodeURIComponent(session), "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "10K-Follow-Assistant" }
      });
      if (gh.status === 204) return new Response(null, { status: 204, headers });
      const body = await gh.text();
      headers.set("Content-Type", "application/json");
      return new Response(body, { status: gh.status, headers });
    }

    // Serve the existing GitHub Pages UI through this same origin so the session cookie stays first-party.
    const page = await fetch(SITE + (url.pathname === "/" ? "/" : url.pathname) + url.search);
    const pageHeaders = new Headers(page.headers);
    pageHeaders.set("X-Content-Type-Options", "nosniff");
    return new Response(page.body, { status: page.status, headers: pageHeaders });
  }
};
