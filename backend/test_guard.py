"""Manual CLI; safe to import during automated test discovery."""

from cost_guard import evaluate_cost_guards


if __name__ == "__main__":
    while True:
        try:
            query = input("Travel query (exit to quit): ").strip()
        except (KeyboardInterrupt, EOFError):
            break
        if not query or query.lower() in {"exit", "quit"}:
            break
        print(evaluate_cost_guards(query))
