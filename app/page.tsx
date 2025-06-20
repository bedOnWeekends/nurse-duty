"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, PlusCircle, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { addDays } from "date-fns"
import { ko } from "date-fns/locale"
import type { DateRange } from "react-day-picker" // DayModifiers 추가
import { cn, formatDate, formatDisplayDate, calculateOffDays, getPositionLabel } from "@/lib/utils"
import { type Nurse, type ScheduleRequest, type ScheduleResponse, POSITION_OPTIONS } from "@/types"
import ScheduleTable from "@/components/schedule-table"
import { motion, AnimatePresence } from "framer-motion"

const API_URL = "/api/schedule"

export default function NurseSchedulePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [nurseName, setNurseName] = useState<string>("")
  const [nursePosition, setNursePosition] = useState<number | undefined>(undefined)
  const [preferredOffDays, setPreferredOffDays] = useState<Date[] | undefined>([])

  const [nurses, setNurses] = useState<Nurse[]>([])
  const [scheduleResult, setScheduleResult] = useState<ScheduleResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false)
  const [isOffDaysPickerOpen, setIsOffDaysPickerOpen] = useState(false)

  const handleAddNurse = () => {
    if (!nurseName.trim() || nursePosition === undefined || !dateRange?.from) return

    const offDaysNumbers = calculateOffDays(preferredOffDays, dateRange.from)

    setNurses([
      ...nurses,
      { id: crypto.randomUUID(), name: nurseName.trim(), position: nursePosition, off: offDaysNumbers },
    ])
    setNurseName("")
    setNursePosition(undefined)
    setPreferredOffDays([])
  }

  const handleRemoveNurse = (id: string) => {
    setNurses(nurses.filter((nurse) => nurse.id !== id))
  }

  const handleGenerateSchedule = async () => {
    if (!dateRange?.from || !dateRange?.to || nurses.length === 0) {
      setError("근무표 기간과 최소 한 명의 간호사를 입력해주세요.")
      return
    }
    setIsLoading(true)
    setError(null)

    const requestBody: ScheduleRequest = {
      start: formatDate(dateRange.from),
      end: formatDate(dateRange.to),
      nurse_list: nurses.map(({ name, position, off }) => ({ name, position, off })),
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "응답을 파싱할 수 없습니다." }))
        const userMessage = errorData.message || `HTTP ${response.status} 오류가 발생했습니다.`
        throw new Error(userMessage)
      }

      const data: ScheduleResponse = await response.json()
      setScheduleResult(data)
    } catch (e: any) {
      setError(e.message || "근무표 생성 중 오류가 발생했습니다.")
      setScheduleResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedo = () => {
    setScheduleResult(null)
    setError(null)
  }

  const isAddNurseDisabled = !nurseName.trim() || nursePosition === undefined || !dateRange?.from
  const isDateRangeDisabled = nurses.length > 0

  const nurseNamesForTable = useMemo(() => {
    if (!scheduleResult || scheduleResult.length === 0) return []
    const firstDayNurses = scheduleResult[0]?.nurses
    if (firstDayNurses && Object.keys(firstDayNurses).length > 0) {
      return Object.keys(firstDayNurses)
    }
    return nurses.map((n) => n.name)
  }, [scheduleResult, nurses])

  const formVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut" } },
    exit: { opacity: 0, y: 50, transition: { duration: 0.3, ease: "easeInOut" } },
  }

  const tableVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeInOut", delay: 0.2 } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.3, ease: "easeInOut" } },
  }

  const handleDateRangeSelect = (
    newRange: DateRange | undefined,
    selectedDate: Date,
    // activeModifiers: DayModifiers, // 이 파라미터는 현재 사용하지 않으므로 주석 처리하거나 제거 가능
    // e: React.MouseEvent, // 이 파라미터는 현재 사용하지 않으므로 주석 처리하거나 제거 가능
  ) => {
    // 현재 dateRange 상태 (즉, 이 클릭 *이전*의 상태)를 기준으로 판단
    if (dateRange?.from && dateRange?.to) {
      // 이미 완전한 범위가 선택된 상태에서 사용자가 날짜를 클릭한 경우:
      // 선택된 날짜(selectedDate)를 새로운 시작일로 하고 종료일은 초기화
      setDateRange({ from: selectedDate, to: undefined })
    } else {
      // 완전한 범위가 아니었던 경우 (시작일만 있거나, 아무것도 없거나):
      // react-day-picker가 제공하는 newRange를 그대로 사용
      setDateRange(newRange)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 p-4 md:p-8 flex flex-col items-center transition-all duration-500 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {scheduleResult && dateRange?.from && dateRange?.to ? (
          <motion.div
            key="scheduleTable"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <ScheduleTable
              scheduleData={scheduleResult}
              nurses={nurseNamesForTable}
              startDate={dateRange.from}
              endDate={dateRange.to}
              onRedo={handleRedo}
            />
          </motion.div>
        ) : (
          <motion.div
            key="scheduleForm"
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-2xl"
          >
            <Card className="mb-8 shadow-xl rounded-xl overflow-hidden">
              <CardHeader className="bg-[#A6DAF4] text-white p-6">
                <CardTitle className="text-3xl font-bold text-center">간호사 근무표 생성기</CardTitle>
                <CardDescription className="text-center text-sky-50 text-sm mt-1">
                  근무 기간과 간호사 정보를 입력하여 근무표를 생성하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 근무표 기간 */}
                <div className="space-y-2">
                  <Label htmlFor="date-range" className="text-lg font-semibold text-gray-700">
                    근무표 기간
                  </Label>
                  <Popover open={isDateRangePickerOpen} onOpenChange={setIsDateRangePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant={"outline"}
                        disabled={isDateRangeDisabled}
                        className={cn(
                          "w-full justify-start text-left font-normal rounded-md transition-colors duration-300",
                          !dateRange && "text-muted-foreground",
                          isDateRangeDisabled && "bg-gray-100 cursor-not-allowed",
                        )}
                        onClick={() => !isDateRangeDisabled && setIsDateRangePickerOpen(!isDateRangePickerOpen)}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-[#A6DAF4]" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to)}
                            </>
                          ) : (
                            formatDisplayDate(dateRange.from)
                          )
                        ) : (
                          <span className="text-gray-500">시작일과 종료일을 선택하세요</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-lg shadow-lg" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleDateRangeSelect as any} // 타입스크립트 호환성을 위해 as any 사용, 실제로는 (DateRange | undefined, Date, DayModifiers, MouseEvent) 형태
                        numberOfMonths={2}
                        locale={ko}
                        className="bg-white rounded-lg"
                        disabled={isDateRangeDisabled}
                      />
                    </PopoverContent>
                  </Popover>
                  {isDateRangeDisabled && (
                    <p className="text-xs text-red-500">간호사가 추가된 후에는 기간을 변경할 수 없습니다.</p>
                  )}
                </div>

                {/* 간호사 정보 입력 */}
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-slate-50 shadow-sm">
                  <h3 className="text-md font-semibold text-gray-600 mb-3">간호사 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="nurse-name" className="text-sm font-medium text-gray-700">
                        이름
                      </Label>
                      <Input
                        id="nurse-name"
                        placeholder="예: 홍길동"
                        value={nurseName}
                        onChange={(e) => setNurseName(e.target.value)}
                        className="rounded-md transition-shadow duration-300 focus:ring-2 focus:ring-[#A6DAF4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nurse-position" className="text-sm font-medium text-gray-700">
                        직책
                      </Label>
                      <Select
                        value={nursePosition !== undefined ? String(nursePosition) : ""}
                        onValueChange={(value) => {
                          const numValue = Number(value)
                          setNursePosition(numValue)
                        }}
                      >
                        <SelectTrigger
                          id="nurse-position"
                          className="rounded-md transition-shadow duration-300 focus:ring-2 focus:ring-[#A6DAF4]"
                        >
                          <SelectValue placeholder="직책 선택" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg shadow-lg">
                          {POSITION_OPTIONS.map((pos) => (
                            <SelectItem
                              key={pos.value}
                              value={String(pos.value)}
                              className="hover:bg-[#E0F2FE] transition-colors duration-150"
                            >
                              {pos.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="off-days" className="text-sm font-medium text-gray-700">
                      희망 휴무일
                    </Label>
                    <Popover open={isOffDaysPickerOpen} onOpenChange={setIsOffDaysPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="off-days"
                          variant={"outline"}
                          disabled={!dateRange?.from}
                          className={cn(
                            "w-full justify-start text-left font-normal rounded-md transition-colors duration-300",
                            !preferredOffDays?.length && "text-muted-foreground",
                            !dateRange?.from && "bg-gray-100 cursor-not-allowed",
                          )}
                          onClick={() => dateRange?.from && setIsOffDaysPickerOpen(!isOffDaysPickerOpen)}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-[#A6DAF4]" />
                          {preferredOffDays && preferredOffDays.length > 0 ? (
                            preferredOffDays.map((day) => formatDisplayDate(day)).join(", ")
                          ) : (
                            <span className="text-gray-500">휴무일을 선택하세요 (다중 선택 가능)</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-lg shadow-lg" align="start">
                        <Calendar
                          mode="multiple"
                          min={0}
                          selected={preferredOffDays}
                          onSelect={setPreferredOffDays}
                          fromDate={dateRange?.from}
                          toDate={dateRange?.to}
                          locale={ko}
                          disabled={
                            !dateRange?.from ||
                            ((day) =>
                              day < (dateRange?.from || new Date()) || (dateRange?.to ? day > dateRange.to : false))
                          }
                          className="bg-white rounded-lg"
                        />
                      </PopoverContent>
                    </Popover>
                    {!dateRange?.from && <p className="text-xs text-red-500">근무표 기간을 먼저 선택해주세요.</p>}
                  </div>
                  <Button
                    onClick={handleAddNurse}
                    disabled={isAddNurseDisabled}
                    className="w-full bg-[#A6DAF4] hover:bg-[#8AC9E3] text-white rounded-md transition-transform duration-300 hover:scale-105"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    간호사 추가
                  </Button>
                </div>

                {nurses.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-md font-semibold text-gray-700">추가된 간호사 목록</h3>
                    <ul className="space-y-2">
                      {nurses.map((nurse) => (
                        <motion.li
                          key={nurse.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                          <div>
                            <span className="font-medium text-gray-800">{nurse.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({getPositionLabel(nurse.position)})</span>
                            {nurse.off.length > 0 && dateRange?.from && (
                              <p className="text-xs text-gray-500 mt-1">
                                희망 휴무:{" "}
                                {nurse.off
                                  .map((offset) => formatDisplayDate(addDays(dateRange.from!, offset)))
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveNurse(nurse.id)}
                            className="text-red-500 hover:bg-red-50 rounded-full p-2 transition-colors duration-300"
                            aria-label={`Remove ${nurse.name}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-6 bg-gray-50 border-t border-gray-200">
                <Button
                  onClick={handleGenerateSchedule}
                  disabled={nurses.length === 0 || isLoading || !dateRange?.from || !dateRange?.to}
                  className="w-full text-lg py-3 bg-[#A6DAF4] hover:bg-[#8AC9E3] text-white rounded-md transition-all duration-300 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "근무 생성 요청"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mt-8">
          <Alert variant="destructive" className="shadow-lg rounded-lg animate-shake">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>오류 발생</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  )
}
