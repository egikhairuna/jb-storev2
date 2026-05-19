export function unauthorizedResponse(reason: string): Response {
  return Response.json({ error: reason }, { status: 401 });
}

export function badRequestResponse(reason: string): Response {
  return Response.json({ error: reason }, { status: 400 });
}

export function serverErrorResponse(reason: string): Response {
  return Response.json({ error: reason }, { status: 500 });
}

export function serviceUnavailableResponse(reason: string): Response {
  return Response.json({ error: reason }, { status: 503 });
}
