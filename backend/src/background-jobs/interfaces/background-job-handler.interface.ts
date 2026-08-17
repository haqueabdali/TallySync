export interface BackgroundJobExecutionContext {
  jobId: string;
  companyId: string;
  attempt: number;
}

export interface BackgroundJobHandler {
  execute(
    payload: Readonly<Record<string, unknown>>,
    context: Readonly<BackgroundJobExecutionContext>,
  ): Promise<Record<string, unknown> | void>;
}
