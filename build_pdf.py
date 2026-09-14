import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Color Palette
PRIMARY_COLOR = colors.HexColor("#1F2522")   # Dark forest text/header
ACCENT_COLOR = colors.HexColor("#355F58")    # Emerald accent
BG_LIGHT = colors.HexColor("#F0F2EF")        # Off-white background
BORDER_COLOR = colors.HexColor("#D9DEDA")    # Border line color
TEXT_DARK = colors.HexColor("#2D3748")       # Body text
AI_BLUE = colors.HexColor("#2563EB")         # AI badge color
WARN_AMBER = colors.HexColor("#D97706")      # Fallback badge color

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to add headers and 'Page X of Y' footers."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_DARK)
        
        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 762, "VoyageAI — System Architecture & Technical Skills Overview")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(36, 754, 576, 754)
        
        # Footer
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        
        self.drawString(36, 30, "Confidential & Proprietary — VoyageAI Project Documentation")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 30, page_text)
        self.restoreState()

def build_pdf(pdf_filename="architecture.pdf"):
    pdf_path = os.path.abspath(pdf_filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=ACCENT_COLOR,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=17,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=ACCENT_COLOR,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=11.5,
        textColor=PRIMARY_COLOR
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=PRIMARY_COLOR
    )

    story = []

    # ---------------------------------------------------------
    # COVER / HEADER BANNER
    # ---------------------------------------------------------
    story.append(Paragraph("VoyageAI Architecture & Skills Report", title_style))
    story.append(Paragraph("A Simplified Technical Guide to System Architecture, Data Flows, and Skills Used", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_COLOR, spaceAfter=10))

    # Executive Summary Card
    summary_html = "<b>Executive Summary:</b> VoyageAI is a full-stack, real-time travel planning platform. It leverages AI-driven itinerary generation (Google Gemini 1.5 Flash with Mock AI fallback), real-time location-aware POI discovery (OpenStreetMap Overpass API), dual-database failover (PostgreSQL + SQLite), and low-latency WebSockets RPC with exponential backoff reconnect and offline request buffering."
    
    summary_table = Table([[Paragraph(summary_html, callout_style)]], colWidths=[540])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 1: SYSTEM ARCHITECTURE OVERVIEW
    # ---------------------------------------------------------
    story.append(Paragraph("1. High-Level System Architecture", h1_style))
    story.append(Paragraph("The VoyageAI ecosystem is split into 5 core layers designed for high responsiveness and fault tolerance:", body_style))
    
    # Diagram 1
    if os.path.exists("diagrams/system_architecture.png"):
        story.append(Image("diagrams/system_architecture.png", width=540, height=324))
        story.append(Spacer(1, 8))

    # Layer Descriptions Table
    layer_data = [
        [Paragraph("System Layer", table_header_style), Paragraph("Component Tech", table_header_style), Paragraph("Role & Architecture Responsibilities", table_header_style)],
        
        [Paragraph("Frontend Client", table_cell_bold), Paragraph("React 18 + TS + Vite<br/>Leaflet Maps", table_cell_style), Paragraph("Renders SPA, user location POI discovery, interactive maps, itinerary builder, and manages WebSocket connection state.", table_cell_style)],
        
        [Paragraph("Backend Server", table_cell_bold), Paragraph("FastAPI + Async Python<br/>WebSockets RPC", table_cell_style), Paragraph("Async event loop, WS route dispatcher, dual envelope RPC handler, ConnectionRegistry multi-client broadcaster.", table_cell_style)],
        
        [Paragraph("AI Provider Layer", table_cell_bold), Paragraph("Gemini 1.5 Flash +<br/>Mock AI Fallback", table_cell_style), Paragraph("Generates dynamic itineraries, day swaps, and weather replanning. 4s timeout instantly trips failover to Mock AI Provider.", table_cell_style)],
        
        [Paragraph("Location Engine", table_cell_bold), Paragraph("Browser Geolocation +<br/>Overpass / OSM API", table_cell_style), Paragraph("Fetches real-time POIs dynamically within 5000m GPS radius without hardcoded location biases.", table_cell_style)],
        
        [Paragraph("Dual DB Store", table_cell_bold), Paragraph("PostgreSQL (Port 5432)<br/>SQLite (voyageai.db)", table_cell_style), Paragraph("Primary PostgreSQL connection with automatic fallback to local SQLite file database. Thread-safe scoped sessions per frame.", table_cell_style)]
    ]

    layer_table = Table(layer_data, colWidths=[100, 130, 310])
    layer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(layer_table)

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECTION 2: DATA FLOW & FAILOVER ARCHITECTURE
    # ---------------------------------------------------------
    story.append(Paragraph("2. Real-Time Data Flow & Failover Architecture", h1_style))
    story.append(Paragraph("VoyageAI uses a resilient WebSocket RPC communication mechanism paired with automatic service failovers to guarantee 100% platform availability:", body_style))

    # Diagram 2
    if os.path.exists("diagrams/sequence_flow.png"):
        story.append(Image("diagrams/sequence_flow.png", width=540, height=270))
        story.append(Spacer(1, 10))

    story.append(Paragraph("Core Resiliency & Protocol Features:", h2_style))
    story.append(Paragraph("• <b>Dual Envelope WS Support:</b> Compatible with <code>{id, action, payload}</code> and legacy <code>{type, reqname, data, requestId}</code> formats.", bullet_style))
    story.append(Paragraph("• <b>Client Reconnection Engine:</b> Implements exponential backoff with jitter (1s to 30s max, 1.5 multiplier) and an offline request buffer (<code>offlineBuffer</code>) that auto-flushes upon socket reconnection.", bullet_style))
    story.append(Paragraph("• <b>AI Fault Tolerance:</b> Gemini 1.5 HTTP requests carry a strict 4.0-second timeout. If Gemini is rate-limited (HTTP 429) or times out, the backend seamlessly returns deterministic Mock AI data without breaking client contracts.", bullet_style))
    story.append(Paragraph("• <b>Database Failover:</b> Attempts PostgreSQL local socket connection first; automatically falls back to SQLite file storage if PostgreSQL service is offline.", bullet_style))

    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # SECTION 3: SKILLS USED IN THIS PROJECT
    # ---------------------------------------------------------
    story.append(Paragraph("3. Technical Skills Used in Project", h1_style))
    story.append(Paragraph("This project integrates skills across modern full-stack development, AI system engineering, real-time networking, geospatial computing, and database design:", body_style))

    skills_data = [
        [Paragraph("Category", table_header_style), Paragraph("Skills & Technologies", table_header_style), Paragraph("Application Context in VoyageAI", table_header_style)],
        
        [Paragraph("Frontend Engineering", table_cell_bold), Paragraph("React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Context API", table_cell_style), Paragraph("Built single-page React app with TypeScript type safety, custom CSS design system (#1F2522, #355F58), reactive trip state management.", table_cell_style)],
        
        [Paragraph("Real-Time WebSockets", table_cell_bold), Paragraph("WebSocket RPC, Exponential Backoff, Offline Buffering, ConnectionRegistry", table_cell_style), Paragraph("Engineered resilient bi-directional socket client/server RPC with auto-reconnect, jitter, offline replay queue, and push event broadcasting.", table_cell_style)],

        [Paragraph("AI Engineering & Prompts", table_cell_bold), Paragraph("Google Gemini 1.5 Flash, Prompt Engineering, Persona Isolation, Fallbacks", table_cell_style), Paragraph("Designed location-agnostic production prompts, persona guardrails (Local Tour Guide vs Trip Operator), structured JSON schema outputs.", table_cell_style)],

        [Paragraph("Geospatial & Mapping", table_cell_bold), Paragraph("Browser Geolocation API, OpenStreetMap / Overpass API, Leaflet Maps", table_cell_style), Paragraph("Implemented live physical GPS coordinate detection with 5000m radius bounding-box queries for dynamic real-time local place discovery.", table_cell_style)],

        [Paragraph("Backend & Data Architecture", table_cell_bold), Paragraph("Python 3.10+, FastAPI, Asyncio, SQLAlchemy, Dual DB (PostgreSQL + SQLite)", table_cell_style), Paragraph("Developed async backend server with dual database auto-failover, thread-safe session scoping per WS message frame, and REST endpoints.", table_cell_style)],

        [Paragraph("DevOps & System Quality", table_cell_bold), Paragraph("Environment Isolation, Virtualenv, Pydantic, HTTP Status Handlers", table_cell_style), Paragraph("Established strict error handling, schema validation, zero-warning TypeScript builds, and isolated virtual environments.", table_cell_style)]
    ]

    skills_table = Table(skills_data, colWidths=[110, 140, 290])
    skills_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(skills_table)

    story.append(Spacer(1, 15))

    # Concluding Box
    conclusion_html = "<b>Summary Conclusion:</b> VoyageAI represents a modern, resilient full-stack architecture built to deliver fast, reliable, location-aware travel planning with high fault tolerance and scalable real-time capabilities."
    conclusion_table = Table([[Paragraph(conclusion_html, callout_style)]], colWidths=[540])
    conclusion_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#E6F0EC")),
        ('BOX', (0,0), (-1,-1), 1, ACCENT_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(conclusion_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF document generated at: {pdf_path}")

if __name__ == "__main__":
    build_pdf("architecture.pdf")
