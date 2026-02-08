export interface ImproveProjectDescriptionRequest {
  description: string;
}

export interface ImproveProjectDescriptionResponse {
  description: string;
}

export interface ValidateProjectDescriptionResult {
  valid: boolean;
  reason?: string;
}