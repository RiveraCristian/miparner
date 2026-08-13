export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(msg: string, details?: unknown) {
    return new AppError(400, "bad_request", msg, details);
  }
  static unauthorized(msg = "No autorizado") {
    return new AppError(401, "unauthorized", msg);
  }
  static forbidden(msg = "Acceso denegado") {
    return new AppError(403, "forbidden", msg);
  }
  static notFound(msg = "No encontrado") {
    return new AppError(404, "not_found", msg);
  }
  static conflict(msg: string) {
    return new AppError(409, "conflict", msg);
  }
}
