"""
生質能校園大亨 - 課後反思學習單 PDF 產生器
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 註冊中文字型
pdfmetrics.registerFont(TTFont('MSJH', 'C:/Windows/Fonts/msjh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('MSJHBD', 'C:/Windows/Fonts/msjhbd.ttc', subfontIndex=0))

OUTPUT = 'D:/caludecode/bioenergy-tycoon/bioenergy-worksheet.pdf'
W, H = A4  # 595.27 x 841.89 points

# Colors
C_DARK   = HexColor('#1a1a2e')
C_ACCENT = HexColor('#16213e')
C_BLUE   = HexColor('#0f3460')
C_TEAL   = HexColor('#1a936f')
C_ORANGE = HexColor('#e94560')
C_LIGHT  = HexColor('#f0f0f0')
C_LINE   = HexColor('#cccccc')
C_GRAY   = HexColor('#666666')

def draw_header(c, y):
    """繪製頁首標題區"""
    # 深色標題列
    c.setFillColor(C_DARK)
    c.roundRect(20*mm, y - 22*mm, W - 40*mm, 22*mm, 3*mm, fill=1, stroke=0)

    # 主標題
    c.setFillColor(white)
    c.setFont('MSJHBD', 16)
    c.drawCentredString(W/2, y - 10*mm, '生質能校園大亨：微電網保衛戰')

    # 副標題
    c.setFont('MSJH', 9)
    c.drawCentredString(W/2, y - 18*mm, 'Bioenergy Campus Tycoon — 課後反思學習單')

    return y - 28*mm

def draw_info_row(c, y):
    """學生資訊欄"""
    c.setStrokeColor(C_LINE)
    c.setLineWidth(0.5)
    c.setFont('MSJHBD', 10)
    c.setFillColor(black)

    fields = [
        ('班級：', 20*mm, 35*mm),
        ('座號：', 58*mm, 25*mm),
        ('姓名：', 86*mm, 40*mm),
        ('日期：', 130*mm, 40*mm),
    ]
    for label, x, width in fields:
        c.drawString(x, y, label)
        lw = c.stringWidth(label, 'MSJHBD', 10)
        c.line(x + lw, y - 1, x + width, y - 1)

    return y - 10*mm

def draw_score_box(c, y):
    """遊戲成績記錄區"""
    c.setFillColor(HexColor('#eef6f0'))
    box_h = 32*mm
    c.roundRect(20*mm, y - box_h, W - 40*mm, box_h, 2*mm, fill=1, stroke=0)

    c.setStrokeColor(C_TEAL)
    c.setLineWidth(1)
    c.roundRect(20*mm, y - box_h, W - 40*mm, box_h, 2*mm, fill=0, stroke=1)

    inner_y = y - 5*mm
    c.setFont('MSJHBD', 11)
    c.setFillColor(C_TEAL)
    c.drawString(25*mm, inner_y, 'PART 0  遊戲成績紀錄')

    inner_y -= 8*mm
    c.setFont('MSJH', 9)
    c.setFillColor(black)

    col1 = [
        ('總分：＿＿＿＿ / 10800', 25*mm),
        ('等級：＿＿＿＿', 90*mm),
    ]
    for text, x in col1:
        c.drawString(x, inner_y, text)

    inner_y -= 7*mm
    col2 = [
        ('發電量：＿＿＿＿ kW', 25*mm),
        ('抗議值：＿＿＿＿ %', 90*mm),
        ('剩餘資金：$＿＿＿＿', 140*mm),
    ]
    for text, x in col2:
        c.drawString(x, inner_y, text)

    return y - box_h - 5*mm

def draw_section(c, y, num, title, questions, line_counts):
    """繪製一個題組區塊"""
    # Section header
    c.setFont('MSJHBD', 11)
    c.setFillColor(C_BLUE)
    c.drawString(20*mm, y, f'PART {num}  {title}')

    y -= 3*mm
    c.setStrokeColor(C_BLUE)
    c.setLineWidth(1.5)
    c.line(20*mm, y, W - 20*mm, y)

    y -= 6*mm

    for i, (q, lines) in enumerate(zip(questions, line_counts)):
        # Question text
        c.setFont('MSJH', 9.5)
        c.setFillColor(black)

        # Number circle
        c.setFillColor(C_BLUE)
        c.circle(24*mm, y + 1.5, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont('MSJHBD', 8)
        c.drawCentredString(24*mm, y - 0.5, str(i + 1))

        c.setFillColor(black)
        c.setFont('MSJH', 9.5)
        c.drawString(30*mm, y, q)

        y -= 6*mm

        # Answer lines
        c.setStrokeColor(C_LINE)
        c.setLineWidth(0.3)
        for _ in range(lines):
            c.line(30*mm, y, W - 20*mm, y)
            y -= 6*mm

        y -= 2*mm

    return y

def draw_reflection_scale(c, y):
    """自評量表"""
    c.setFont('MSJHBD', 11)
    c.setFillColor(C_BLUE)
    c.drawString(20*mm, y, 'PART 5  自我評量')

    y -= 3*mm
    c.setStrokeColor(C_BLUE)
    c.setLineWidth(1.5)
    c.line(20*mm, y, W - 20*mm, y)

    y -= 7*mm

    items = [
        '我理解厭氧消化的基本原理（C/N 比、pH 值）',
        '我能解釋生質能系統中各設備的功能與連接順序',
        '我理解外部成本（臭味、噪音）對社區的影響',
        '我能說明微電網在停電時的韌性價值',
        '我認為再生能源規劃需要兼顧技術、經濟與社會面向',
    ]
    scale_labels = ['非常不同意', '不同意', '普通', '同意', '非常同意']

    # Scale header
    c.setFont('MSJH', 7.5)
    c.setFillColor(C_GRAY)
    scale_x_start = 120*mm
    scale_spacing = 16*mm
    for j, label in enumerate(scale_labels):
        x = scale_x_start + j * scale_spacing
        c.drawCentredString(x, y, label)

    y -= 5*mm

    for item in items:
        c.setFont('MSJH', 9)
        c.setFillColor(black)
        c.drawString(22*mm, y, item)

        # Draw circles for scale
        for j in range(5):
            x = scale_x_start + j * scale_spacing
            c.setStrokeColor(C_BLUE)
            c.setLineWidth(0.8)
            c.setFillColor(white)
            c.circle(x, y + 1.5, 4, fill=1, stroke=1)

        y -= 8*mm

    return y

def draw_footer(c, page_num):
    """頁尾"""
    c.setFont('MSJH', 7)
    c.setFillColor(C_GRAY)
    c.drawCentredString(W/2, 10*mm, f'生質能校園大亨：微電網保衛戰 — 課後反思學習單  |  第 {page_num} 頁')

def create_worksheet():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    c.setTitle('生質能校園大亨 - 課後反思學習單')
    c.setAuthor('Bioenergy Campus Tycoon')

    # ─── 第一頁 ───
    y = H - 15*mm
    y = draw_header(c, y)
    y -= 3*mm
    y = draw_info_row(c, y)
    y -= 3*mm
    y = draw_score_box(c, y)
    y -= 2*mm

    y = draw_section(c, y, 1, '系統設計回顧', [
        '你的生質能系統使用了哪些原料？處理流程的順序為何？',
        '你的 C/N 比最終落在什麼範圍？如果不在最佳區間（20-30），你認為原因是什麼？',
        '如果重新玩一次，你會如何改變設備配置或原料選擇？為什麼？',
    ], [2, 2, 3])

    y -= 2*mm

    y = draw_section(c, y, 2, '外部成本與社會影響', [
        '你的抗議值最終是多少？主要來自哪些外部成本？（臭味／噪音／過近／砍樹）',
        '現實中，生質能設施常遭遇「鄰避效應」（NIMBY）。根據遊戲經驗，你覺得可以如何降低社區反對？',
    ], [2, 3])

    draw_footer(c, 1)
    c.showPage()

    # ─── 第二頁 ───
    y = H - 15*mm

    y = draw_section(c, y, 3, '能源韌性與微電網', [
        '遊戲中的「颱風停電」事件發生時，你的校園建築有被你的微電網供電嗎？結果如何？',
        '為什麼平時接電只給少量分數，但停電時接電卻大量加分？這反映了現實中的什麼概念？',
        '台灣近年常因極端氣候導致停電。你認為校園建置微電網的優先順序應該是什麼？（例如：哪些建築最需要備援電力？）',
    ], [2, 3, 3])

    y -= 2*mm

    y = draw_section(c, y, 4, '永續發展思辨', [
        '遊戲中你需要在「發電量」「外部成本」「資金」「韌性」之間取捨。現實中的能源規劃還需要考慮哪些因素？',
        '生質能相比太陽能、風力發電，有什麼獨特的優勢和限制？',
        '如果你是學校的能源規劃顧問，你會建議怎麼利用校園廢棄物來發電？請寫出一個簡單的計畫。',
    ], [3, 3, 4])

    y -= 2*mm

    y = draw_reflection_scale(c, y)

    draw_footer(c, 2)
    c.save()
    print(f'PDF created: {OUTPUT}')

if __name__ == '__main__':
    create_worksheet()
