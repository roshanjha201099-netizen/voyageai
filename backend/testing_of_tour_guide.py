from cost_guard import evaluate_cost_guards


def run():
    while True:
        query = input("Enter your query: ").strip()
        if not query:
            continue
        if query.lower() in ("exit", "quit", "q"):
            print("Exiting...")
            break

        should_call_llm, gate_reason, reply = evaluate_cost_guards(query)

        print("\n--- Cost Guard Result ---")
        print(f"Should Call LLM : {should_call_llm}")
        print(f"Gate Triggered  : {gate_reason}")
        if reply:
            print(f"Deflect Reply   : {reply}")
        print("--------------------------\n")


if __name__ == "__main__":
    run()