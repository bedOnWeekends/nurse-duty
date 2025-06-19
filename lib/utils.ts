import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays, addDays } from "date-fns"
import { POSITION_OPTIONS } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: Date | undefined): string => {
  return date ? format(date, "yyyy-MM-dd") : ""
}

export const formatDisplayDate = (date: Date | undefined): string => {
  return date ? format(date, "MM월 dd일") : ""
}

export const getPositionLabel = (value: number): string => {
  const position = POSITION_OPTIONS.find((p) => p.value === value)
  return position ? position.label : "알 수 없음"
}

export const calculateOffDays = (selectedDates: Date[] | undefined, startDate: Date | undefined): number[] => {
  if (!selectedDates || !startDate) return []
  return selectedDates.map((date) => differenceInDays(date, startDate)).sort((a, b) => a - b)
}

export const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = []
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(currentDate)
    currentDate = addDays(currentDate, 1)
  }
  return dates
}
