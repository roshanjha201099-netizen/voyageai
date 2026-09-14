import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Set clean styling for diagrams
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

def create_system_architecture_diagram(output_path):
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')
    
    # Background card
    rect_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 5.6, boxstyle="round,pad=0.1", 
                                     ec="#D9DEDA", fc="#F8F9FA", lw=1.5)
    ax.add_patch(rect_bg)
    
    # Title
    ax.text(5, 5.4, "VoyageAI - System Architecture Overview", fontsize=14, fontweight='bold', ha='center', color="#1F2522")
    
    # Node 1: Client Application (Frontend)
    c_box = patches.FancyBboxPatch((0.6, 3.2), 2.4, 1.8, boxstyle="round,pad=0.1", ec="#355F58", fc="#E6F0EC", lw=2)
    ax.add_patch(c_box)
    ax.text(1.8, 4.6, "React + TS Frontend", fontsize=11, fontweight='bold', ha='center', color="#1F2522")
    ax.text(1.8, 4.2, "• Leaflet Maps & Geolocation\n• wsClient (Reconnection)\n• TripContext & UI Views", fontsize=8.5, ha='center', color="#355F58")
    
    # Node 2: FastAPI Backend Server
    b_box = patches.FancyBboxPatch((3.8, 3.2), 2.4, 1.8, boxstyle="round,pad=0.1", ec="#2B4C44", fc="#D9E6E2", lw=2)
    ax.add_patch(b_box)
    ax.text(5.0, 4.6, "FastAPI Backend", fontsize=11, fontweight='bold', ha='center', color="#1F2522")
    ax.text(5.0, 4.2, "• WebSocket RPC Router\n• ConnectionRegistry\n• Thread-Safe DB Scoping", fontsize=8.5, ha='center', color="#2B4C44")
    
    # Node 3: External Services & External APIs
    ext_box = patches.FancyBboxPatch((7.0, 3.8), 2.4, 1.2, boxstyle="round,pad=0.1", ec="#D97706", fc="#FEF3C7", lw=2)
    ax.add_patch(ext_box)
    ax.text(8.2, 4.6, "External APIs", fontsize=10, fontweight='bold', ha='center', color="#92400E")
    ax.text(8.2, 4.1, "• Overpass API (Places)\n• OpenStreetMap POIs", fontsize=8, ha='center', color="#B45309")
    
    # Node 4: AI Layer (Gemini + Mock Fallback)
    ai_box = patches.FancyBboxPatch((7.0, 2.2), 2.4, 1.3, boxstyle="round,pad=0.1", ec="#2563EB", fc="#EFF6FF", lw=2)
    ax.add_patch(ai_box)
    ax.text(8.2, 3.1, "AI Provider Engine", fontsize=10, fontweight='bold', ha='center', color="#1E40AF")
    ax.text(8.2, 2.6, "• Gemini 1.5 Flash (4s timeout)\n• Mock AI Provider Fallback", fontsize=8, ha='center', color="#1D4ED8")
    
    # Node 5: Database Layer (PostgreSQL + SQLite)
    db_box = patches.FancyBboxPatch((3.8, 0.6), 2.4, 1.8, boxstyle="round,pad=0.1", ec="#7C3AED", fc="#F5F3FF", lw=2)
    ax.add_patch(db_box)
    ax.text(5.0, 2.0, "Dual-Database Layer", fontsize=10, fontweight='bold', ha='center', color="#5B21B6")
    ax.text(5.0, 1.4, "• PostgreSQL (Port 5432)\n• SQLite (voyageai.db Fallback)\n• SQLAlchemy Models & Sessions", fontsize=8, ha='center', color="#6D28D9")

    # Arrows
    # Client <-> Backend
    ax.annotate("", xy=(3.8, 4.1), xytext=(3.0, 4.1),
                arrowprops=dict(arrowstyle="<->", color="#355F58", lw=2))
    ax.text(3.4, 4.3, "WS / RPC", fontsize=8, fontweight='bold', ha='center', color="#355F58")

    # Client <-> External APIs (Direct Overpass queries)
    ax.annotate("", xy=(7.0, 4.4), xytext=(3.0, 4.8),
                arrowprops=dict(arrowstyle="<->", color="#D97706", lw=1.5, connectionstyle="arc3,rad=-0.2"))
    ax.text(5.0, 5.1, "Overpass POI Fetching", fontsize=8, fontweight='bold', ha='center', color="#D97706")

    # Backend <-> AI Provider
    ax.annotate("", xy=(7.0, 3.0), xytext=(6.2, 3.7),
                arrowprops=dict(arrowstyle="<->", color="#2563EB", lw=2))
    ax.text(6.6, 3.5, "Prompts / JSON", fontsize=8, fontweight='bold', ha='center', color="#2563EB")

    # Backend <-> Database Layer
    ax.annotate("", xy=(5.0, 2.4), xytext=(5.0, 3.2),
                arrowprops=dict(arrowstyle="<->", color="#7C3AED", lw=2))
    ax.text(5.3, 2.8, "SQLAlchemy", fontsize=8, fontweight='bold', ha='center', color="#7C3AED")

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

def create_sequence_diagram(output_path):
    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis('off')
    
    # Background card
    rect_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 5.6, boxstyle="round,pad=0.1", 
                                     ec="#D9DEDA", fc="#FAFBFB", lw=1.5)
    ax.add_patch(rect_bg)
    
    ax.text(5, 5.4, "Real-Time Execution & Failover Data Flow", fontsize=14, fontweight='bold', ha='center', color="#1F2522")
    
    # Timeline Lifelines
    lifelines = [
        ("User / Frontend", 1.5, "#355F58"),
        ("FastAPI WS Server", 4.0, "#2B4C44"),
        ("Gemini AI API", 6.5, "#2563EB"),
        ("Mock AI (Fallback)", 8.5, "#D97706")
    ]
    
    for name, x, col in lifelines:
        ax.plot([x, x], [0.8, 4.8], color="#CBD5E1", linestyle="--", lw=1.5)
        box = patches.FancyBboxPatch((x-0.9, 4.8), 1.8, 0.5, boxstyle="round,pad=0.05", ec=col, fc=col, lw=1)
        ax.add_patch(box)
        ax.text(x, 5.05, name, fontsize=9, fontweight='bold', ha='center', color="#FFFFFF")
        
    # Flow step 1: Request sent
    ax.annotate("", xy=(4.0, 4.2), xytext=(1.5, 4.2),
                arrowprops=dict(arrowstyle="->", color="#355F58", lw=1.5))
    ax.text(2.75, 4.3, "1. WS RPC: plan_trip / chat", fontsize=8, ha='center', color="#1F2522", fontweight='bold')
    
    # Flow step 2: Backend calls Gemini
    ax.annotate("", xy=(6.5, 3.6), xytext=(4.0, 3.6),
                arrowprops=dict(arrowstyle="->", color="#2563EB", lw=1.5))
    ax.text(5.25, 3.7, "2. Async HTTP (4s timeout)", fontsize=8, ha='center', color="#1E40AF", fontweight='bold')

    # Flow step 3: Timeout / Error
    ax.text(6.5, 3.0, "X (Timeout / 429 Error)", fontsize=8, ha='center', color="#DC2626", fontweight='bold')
    
    # Flow step 4: Fallback to Mock AI
    ax.annotate("", xy=(8.5, 2.4), xytext=(4.0, 2.4),
                arrowprops=dict(arrowstyle="->", color="#D97706", lw=1.5, linestyle="--"))
    ax.text(6.25, 2.5, "3. Failover to Mock AI Provider", fontsize=8, ha='center', color="#B45309", fontweight='bold')
    
    # Flow step 5: Mock AI response
    ax.annotate("", xy=(4.0, 1.8), xytext=(8.5, 1.8),
                arrowprops=dict(arrowstyle="->", color="#D97706", lw=1.5))
    ax.text(6.25, 1.9, "4. Structured JSON Response", fontsize=8, ha='center', color="#B45309")

    # Flow step 6: Response back to frontend
    ax.annotate("", xy=(1.5, 1.2), xytext=(4.0, 1.2),
                arrowprops=dict(arrowstyle="->", color="#355F58", lw=1.5))
    ax.text(2.75, 1.3, "5. WS RPC Success Reply (Status 200)", fontsize=8, ha='center', color="#355F58", fontweight='bold')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

if __name__ == "__main__":
    os.makedirs("diagrams", exist_ok=True)
    create_system_architecture_diagram("diagrams/system_architecture.png")
    create_sequence_diagram("diagrams/sequence_flow.png")
    print("Diagrams generated successfully!")
