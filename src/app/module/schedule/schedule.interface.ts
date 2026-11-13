export interface ICreateSchedulePayload {
  starDateTime: Date;
  endDateTime: Date;
  meetingLink: string;
}

export interface IUpdateSchedulePayload {
  starDateTime?: Date;
  endDateTime?: Date;
  meetingLink?: string;
}
