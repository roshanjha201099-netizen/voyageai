"""
Interactive tester for tour_guide_service.py

Put this file in the SAME folder as tour_guide_service.py, then run:

    python chat_test.py                      # local mode, guest (nothing saved to DB)
    python chat_test.py --mode trip --dest "Goa"
    python chat_test.py --lat 28.6139 --lng 77.2090      # Delhi coordinates
    python chat_test.py --user user_123      # real user id -> messages ARE saved to DB

In-chat commands:
    /mode local|trip     switch mode
    /dest <name>         set trip destination
    /loc <lat> <lng>     set your GPS location
    /history             show what the bot remembers (last messages in this session)
    /quit                exit
"""

import argparse
import json
import time

from tour_guide_service import process_concierge_message


def show(result: dict, seconds: float) -> None:
    print("\n--- BOT ---------------------------------------------")
    print(result.get("reply"))
    print("-----------------------------------------------------")
    print(f"chips : {result.get('chips')}")
    if result.get("card"):
        print(f"card  : {json.dumps(result['card'], ensure_ascii=False)}")
    print(f"gate  : {result.get('gate')}   mode: {result.get('mode')}   time: {seconds:.2f}s")
    if result.get("error"):
        print(f"ERROR : {result['error']}")
    print()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="guest_tester",
                    help="user id. Ids starting with 'guest_' are NOT saved to the DB")
    ap.add_argument("--mode", default="local", choices=["local", "trip"])
    ap.add_argument("--dest", default=None, help="trip destination (trip mode)")
    ap.add_argument("--lat", type=float, default=None)
    ap.add_argument("--lng", type=float, default=None)
    ap.add_argument("--trip-id", default=None)
    args = ap.parse_args()

    mode, dest, lat, lng = args.mode, args.dest, args.lat, args.lng
    session_history = []  # kept in memory so guests also get conversation memory

    print(f"VoyageAI tester | user={args.user} | mode={mode} | dest={dest} | loc=({lat}, {lng})")
    print("Type a message, or /quit to exit.\n")

    while True:
        try:
            msg = input("You> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not msg:
            continue

        if msg.startswith("/"):
            parts = msg.split()
            cmd = parts[0].lower()
            if cmd == "/quit":
                break
            elif cmd == "/mode" and len(parts) > 1 and parts[1] in ("local", "trip"):
                mode = parts[1]
                print(f"mode -> {mode}\n")
            elif cmd == "/dest" and len(parts) > 1:
                dest = " ".join(parts[1:])
                print(f"destination -> {dest}\n")
            elif cmd == "/loc" and len(parts) == 3:
                try:
                    lat, lng = float(parts[1]), float(parts[2])
                    print(f"location -> ({lat}, {lng})\n")
                except ValueError:
                    print("usage: /loc <lat> <lng>\n")
            elif cmd == "/history":
                for h in session_history[-10:]:
                    print(f"  {h['role']}: {h['content'][:120]}")
                print()
            else:
                print("unknown command\n")
            continue

        start = time.time()
        try:
            result = process_concierge_message(
                user_id=args.user,
                message=msg,
                mode=mode,
                trip_id=args.trip_id,
                destination_name=dest,
                lat=lat,
                lng=lng,
                recent_history=session_history,  # avoids a DB read; keeps memory in this session
            )
        except Exception as e:
            print(f"\n[CRASH] {type(e).__name__}: {e}\n")
            continue

        show(result, time.time() - start)
        session_history.append({"role": "user", "content": msg})
        session_history.append({"role": "assistant", "content": result.get("reply", "")})


if __name__ == "__main__":
    main()