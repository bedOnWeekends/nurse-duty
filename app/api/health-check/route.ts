import { NextResponse } from "next/server"

const EXTERNAL_API_URL = "https://weatherapp-11.azurewebsites.net/api/HttpTrigger2"

export async function GET() {
  try {
    console.log("=== Health Check Started ===")
    console.log("Target URL:", EXTERNAL_API_URL)

    // 간단한 HEAD 요청으로 서버 상태 확인
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

    const response = await fetch(EXTERNAL_API_URL, {
      method: "HEAD",
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId)
      console.error("Health check fetch error:", fetchError)
      throw fetchError
    })

    clearTimeout(timeoutId)

    console.log("=== Health Check Response ===")
    console.log("Status:", response.status)
    console.log("Status Text:", response.statusText)
    console.log("Headers:", Object.fromEntries(response.headers.entries()))

    return NextResponse.json({
      status: "success",
      externalApiStatus: response.status,
      externalApiStatusText: response.statusText,
      timestamp: new Date().toISOString(),
      reachable: true,
    })
  } catch (error: any) {
    console.error("=== Health Check Failed ===")
    console.error("Error:", error)

    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        errorName: error.name,
        timestamp: new Date().toISOString(),
        reachable: false,
      },
      { status: 500 },
    )
  }
}
