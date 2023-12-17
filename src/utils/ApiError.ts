class ApiError<Data = null> extends Error {
  public statusCode: number;
  public message: string;
  public data: Data;
  public success: boolean;
  public errors: Error[];

  constructor(
    statusCode: number,
    message: string = 'Something went wrong',
    errors: Error[] = [],
    stack: string = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null as Data;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
