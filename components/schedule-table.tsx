"use client"

import type React from "react"
import { useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ScheduleResponse, SHIFT_DISPLAY_MAP } from "@/types"
import { formatDisplayDate, getDatesInRange } from "@/lib/utils"
import html2canvas from "html2canvas"
import { Download, ImageIcon, RotateCcw, FileText } from "lucide-react"
import { format } from "date-fns"

interface ScheduleTableProps {
  scheduleData: ScheduleResponse
  nurses: string[]
  startDate: Date
  endDate: Date
  onRedo: () => void
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ scheduleData, nurses, startDate, endDate, onRedo }) => {
  const tableRef = useRef<HTMLDivElement>(null)

  if (!scheduleData || scheduleData.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>근무표 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <p>생성된 근무표가 없습니다.</p>
          <Button onClick={onRedo} className="mt-4 bg-[#A6DAF4] hover:bg-[#8AC9E3] text-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            다시 작성
          </Button>
        </CardContent>
      </Card>
    )
  }

  const allDates = getDatesInRange(startDate, endDate)

  const handleSaveAsImage = () => {
    if (tableRef.current) {
      html2canvas(tableRef.current, { scale: 2 }).then((canvas) => {
        const image = canvas.toDataURL("image/png")
        const link = document.createElement("a")
        link.href = image
        link.download = `간호사_근무표_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.png`
        link.click()
      })
    }
  }

  const handleSaveAsCSV = () => {
    if (!scheduleData || scheduleData.length === 0) return

    try {
      // CSV 헤더 생성
      const headers = ["간호사", ...allDates.map((date) => formatDisplayDate(date))]

      // CSV 데이터 생성
      const csvData = [
        headers.join(","), // 헤더 행
        ...nurses.map((nurseName) => {
          const row = [nurseName]
          allDates.forEach((dateObj) => {
            const dateStr = format(dateObj, "yyyy-MM-dd")
            const scheduleForDate = scheduleData.find((s) => s.date === dateStr)
            const shift = scheduleForDate?.nurses[nurseName]
            row.push(shift ? SHIFT_DISPLAY_MAP[shift] : "")
          })
          return row.join(",")
        }),
      ]

      // CSV 문자열 생성
      const csvContent = csvData.join("\n")

      // BOM 추가 (한글 깨짐 방지)
      const BOM = "\uFEFF"
      const csvWithBOM = BOM + csvContent

      // Blob 생성 및 다운로드
      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute(
          "download",
          `간호사_근무표_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.csv`,
        )
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("CSV 저장 중 오류 발생:", error)
      alert("CSV 파일 저장 중 오류가 발생했습니다.")
    }
  }

  const handleSaveAsExcel = async () => {
    if (!scheduleData || scheduleData.length === 0) return

    try {
      // 동적으로 xlsx 라이브러리 로드
      const XLSX = await import("xlsx")

      // 테이블 데이터 생성
      const tableData: (string | undefined)[][] = []

      // 헤더 행
      const headerRow: (string | undefined)[] = ["간호사"]
      allDates.forEach((date) => headerRow.push(formatDisplayDate(date)))
      tableData.push(headerRow)

      // 데이터 행
      nurses.forEach((nurseName) => {
        const nurseRow: (string | undefined)[] = [nurseName]
        allDates.forEach((dateObj) => {
          const dateStr = format(dateObj, "yyyy-MM-dd")
          const scheduleForDate = scheduleData.find((s) => s.date === dateStr)
          const shift = scheduleForDate?.nurses[nurseName]
          nurseRow.push(shift ? SHIFT_DISPLAY_MAP[shift] : "")
        })
        tableData.push(nurseRow)
      })

      // 워크시트 생성
      const worksheet = XLSX.utils.aoa_to_sheet(tableData)

      // 열 너비 설정
      const colWidths = [{ wch: 15 }, ...allDates.map(() => ({ wch: 10 }))]
      worksheet["!cols"] = colWidths

      // 워크북 생성
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "근무표")

      // 파일 저장
      XLSX.writeFile(workbook, `간호사_근무표_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.xlsx`)
    } catch (error) {
      console.error("Excel 저장 중 오류 발생:", error)

      // Excel 저장 실패 시 CSV로 대체
      alert("Excel 저장에 실패했습니다. CSV 파일로 저장합니다.")
      handleSaveAsCSV()
    }
  }

  const renderTableChunks = () => {
    const chunks = []
    for (let i = 0; i < allDates.length; i += 7) {
      const dateChunk = allDates.slice(i, i + 7)
      chunks.push(
        <div key={`chunk-${i}`} className="mb-8 overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[100px]">간호사</TableHead>
                {dateChunk.map((date) => (
                  <TableHead key={formatDisplayDate(date)} className="text-center min-w-[80px]">
                    {formatDisplayDate(date)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {nurses.map((nurseName) => (
                <TableRow key={nurseName}>
                  <TableCell className="font-medium sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[100px]">
                    {nurseName}
                  </TableCell>
                  {dateChunk.map((dateObj) => {
                    const dateStr = format(dateObj, "yyyy-MM-dd")
                    const scheduleForDate = scheduleData.find((s) => s.date === dateStr)
                    const shift = scheduleForDate?.nurses[nurseName]
                    return (
                      <TableCell
                        key={`${nurseName}-${format(dateObj, "yyyy-MM-dd")}`}
                        className="text-center min-w-[80px]"
                      >
                        {shift ? SHIFT_DISPLAY_MAP[shift] : "-"}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>,
      )
    }
    return chunks
  }

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 shadow-lg rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold text-gray-700">근무표 결과</CardTitle>
        <div className="flex space-x-2 flex-wrap">
          <Button
            onClick={handleSaveAsImage}
            variant="outline"
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            이미지로 저장
          </Button>
          <Button
            onClick={handleSaveAsCSV}
            variant="outline"
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <FileText className="mr-2 h-4 w-4" />
            CSV로 저장
          </Button>
          <Button
            onClick={handleSaveAsExcel}
            variant="outline"
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Excel로 저장
          </Button>
          <Button onClick={onRedo} className="bg-[#A6DAF4] hover:bg-[#8AC9E3] text-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            다시 작성
          </Button>
        </div>
      </CardHeader>
      <CardContent ref={tableRef} className="p-6 bg-white">
        {renderTableChunks()}
      </CardContent>
    </Card>
  )
}

export default ScheduleTable
