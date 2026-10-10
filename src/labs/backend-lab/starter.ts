// Visible, editable code for the first request; the simulator has no fallback handler.
export const FIRST_ENDPOINT_STARTER = `// Press Send to try GET /users, then change this response.
function handleRequest(request) {
  if (request.method === "GET" && request.path === "/users") {
    return { status: 200, body: [{ id: 1, name: "Ada" }] };
  }
  return { status: 404, body: { error: "Not found" } };
}
`;
