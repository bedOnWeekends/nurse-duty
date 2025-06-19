import { NextResponse } from "next/server"

const EXTERNAL_API_URL = "https://weatherapp-11.azurewebsites.net/api/HttpTrigger2"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("=== API Proxy Debug Info ===")
    console.log("Request body:", JSON.stringify(body, null, 2))
    console.log("Target URL:", EXTERNAL_API_URL)
    console.log("Timestamp:", new Date().toISOString())

    // 네트워크 연결 테스트를 위한 더 자세한 fetch 옵션
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NurseScheduler/1.0",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId)
      console.error("=== Fetch Error Details ===")
      console.error("Error name:", fetchError.name)
      console.error("Error message:", fetchError.message)
      console.error("Error cause:", fetchError.cause)
      console.error("Full error:", fetchError)

      // 구체적인 에러 타입별 메시지
      if (fetchError.name === "AbortError") {
        throw new Error("요청 시간이 초과되었습니다. Azure 서비스가 응답하지 않습니다.")
      } else if (fetchError.name === "TypeError" && fetchError.message.includes("fetch")) {
        throw new Error("네트워크 연결에 실패했습니다. DNS 해석 또는 연결 문제일 수 있습니다.")
      } else if (fetchError.message.includes("certificate") || fetchError.message.includes("SSL")) {
        throw new Error("SSL/TLS 인증서 문제가 발생했습니다.")
      } else {
        throw new Error(`네트워크 오류: ${fetchError.message}`)
      }
    })

    clearTimeout(timeoutId)

    console.log("=== Response Info ===")
    console.log("Status:", response.status)
    console.log("Status Text:", response.statusText)
    console.log("Headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      console.error("=== External API Error ===")
      console.error("Status:", response.status)
      console.error("Status Text:", response.statusText)

      let errorData: any = {}
      let responseText = ""

      try {
        // 먼저 텍스트로 응답을 읽어봅니다
        responseText = await response.text()
        console.error("Raw Response Text:", responseText)

        // JSON 파싱을 시도합니다
        if (responseText.trim()) {
          try {
            errorData = JSON.parse(responseText)
            console.error("Parsed Error Response:", errorData)
          } catch (jsonError) {
            console.error("Failed to parse response as JSON:", jsonError)
            errorData = { message: responseText }
          }
        } else {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }
      } catch (readError) {
        console.error("Failed to read response:", readError)
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
      }

      // 상태 코드별 구체적인 메시지
      let userFriendlyMessage = ""
      switch (response.status) {
        case 400:
          userFriendlyMessage = "잘못된 요청입니다. 입력 데이터를 확인해주세요."
          break
        case 401:
          userFriendlyMessage = "인증이 필요합니다."
          break
        case 403:
          userFriendlyMessage = "접근이 거부되었습니다."
          break
        case 404:
          userFriendlyMessage = "API 엔드포인트를 찾을 수 없습니다."
          break
        case 429:
          userFriendlyMessage = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
          break
        case 500:
          userFriendlyMessage = "서버 내부 오류가 발생했습니다."
          break
        case 502:
          userFriendlyMessage = "게이트웨이 오류가 발생했습니다."
          break
        case 503:
          userFriendlyMessage = "서비스를 사용할 수 없습니다."
          break
        case 504:
          userFriendlyMessage = "게이트웨이 시간 초과가 발생했습니다."
          break
        default:
          userFriendlyMessage = `서버 오류 (${response.status}): ${response.statusText}`
      }

      return NextResponse.json(
        {
          message: errorData.message || userFriendlyMessage,
          status: response.status,
          statusText: response.statusText,
          details: errorData,
          rawResponse: responseText,
        },
        { status: response.status },
      )
    }

    let data
    try {
      const responseText = await response.text()
      console.log("=== Success Response Text ===")
      console.log("Response length:", responseText.length)
      console.log("Response preview:", responseText.substring(0, 500))

      if (responseText.trim()) {
        data = JSON.parse(responseText)
        console.log("=== Parsed Success Response ===")
        console.log("Response data type:", typeof data)
        console.log("Is array:", Array.isArray(data))
        if (Array.isArray(data)) {
          console.log("Array length:", data.length)
          console.log("First item:", data[0])
        }
      } else {
        throw new Error("Empty response from server")
      }
    } catch (parseError) {
      console.error("=== Response Parse Error ===")
      console.error("Parse error:", parseError)
      throw new Error("서버 응답을 파싱할 수 없습니다.")
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("=== Proxy API Error ===")
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    return NextResponse.json(
      {
        message: error.message || "서버에서 알 수 없는 오류가 발생했습니다.",
        error: error.name,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
