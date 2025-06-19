export interface Nurse {
  id: string
  name: string
  position: number // 0: 수간호사, 1: 책임 간호사, 2: 주임 간호사, 3: 평간호사
  off: number[] // 근무표 시작일로부터의 날짜 수
}

export interface ScheduleRequest {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  nurse_list: Omit<Nurse, "id">[]
}

export interface ScheduleResponseItem {
  date: string // YYYY-MM-DD
  nurses: {
    [nurseName: string]: "day" | "evening" | "night" | "off"
  }
}

export type ScheduleResponse = ScheduleResponseItem[]

export interface PositionMap {
  [key: string]: number
}

export const POSITION_OPTIONS = [
  { label: "수간호사", value: 0 },
  { label: "책임 간호사", value: 1 },
  { label: "주임 간호사", value: 2 },
  { label: "평간호사", value: 3 },
]

export const SHIFT_DISPLAY_MAP = {
  day: "D",
  evening: "E",
  night: "N",
  off: "OFF",
}
