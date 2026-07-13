import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
  return text.replace(/\s+/g, " ").trim()
}

function extractPageTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].replace(/\s+/g, " ").trim() : ""
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "服务端未配置 DEEPSEEK_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { url } = await req.json()
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "缺少 url 参数" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const pageResp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PrismBot/1.0; +https://example.com/bot)",
      },
    })
    if (!pageResp.ok) {
      return new Response(
        JSON.stringify({ error: `抓取网页失败 (HTTP ${pageResp.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    const html = await pageResp.text()
    const pageTitle = extractPageTitle(html)
    let text = htmlToText(html)

    if (text.length < 30) {
      return new Response(
        JSON.stringify({ error: "该网页正文内容过少或需要登录，无法提取" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (text.length > 8000) text = text.slice(0, 8000)

    const systemPrompt =
      "你是一个中文笔记助手。请阅读用户提供的网页正文，输出一个 JSON 对象，" +
      "字段为：title（简洁标题，不超过 30 字）、" +
      "summary（HTML 片段：先用一个 <p> 段落两三句话概括全文，" +
      "再用一个 <ul> 列表、每个要点一个 <li> 分点罗列关键信息；" +
      "只允许使用 <p>、<ul>、<li>、<strong> 这几种标签，不要 markdown、不要代码块）、" +
      "tags（2 到 3 个精炼的中文主题标签，数组）。" +
      "只输出 JSON，不要任何额外说明。"

    const aiResp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `网页标题参考：${pageTitle || "（无）"}\n\n网页正文：\n${text}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    if (!aiResp.ok) {
      const errText = await aiResp.text()
      return new Response(
        JSON.stringify({ error: `DeepSeek 调用失败: ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiData = await aiResp.json()
    const raw = aiData?.choices?.[0]?.message?.content ?? "{}"

    let parsed: { title?: string; summary?: string; tags?: string[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : {}
    }

    const result = {
      title: (parsed.title || pageTitle || "未命名笔记").toString().slice(0, 60),
      summary: (parsed.summary || "").toString(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 3).map((t) => String(t)).filter(Boolean)
        : [],
    }

    if (!result.summary) {
      return new Response(
        JSON.stringify({ error: "AI 未能生成摘要，请稍后重试" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    if (result.tags.length === 0) result.tags = ["未分类"]

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `服务端异常: ${(e as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
