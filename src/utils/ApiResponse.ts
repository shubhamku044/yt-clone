class ApiResponse<Data> {
  public statusCode: number;
  public data: Data;
  public message: string;
  constructor (
    statusCode: number,
    data: Data,
    message: string = 'Success'
  ) {
    this.statusCode = statusCode
    ;
    this.data = data;
    this.message = message;
  }
}

export { ApiResponse };