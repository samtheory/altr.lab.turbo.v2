from pathlib import Path

p = Path("Docs/report/STATUS.md")
text = p.read_text(encoding="utf-8")
text = text.replace("\r\n", "\n").replace("\r", "\n")

old_impl = (
    "- **Phase-03 S0046 / jord-F0023 (partial)** — three-pane shell + nav `contextual` + inspector overlay frame · [[../tech_space/jord/studio/README#three-pane-shell-s0046]] · card [[../plan/Jord/phase-03/done/S0046-three-pane-shell|S0046]]\n"
    "- **Phase-03 S0047 / jord-F0023 (partial)** — contextual sidebars for Tables/Jobs/APIs + shared sidebar list primitive + resize/persist/URL selection · [[../tech_space/jord/studio/README#contextual-sidebars-s0047]] · card [[../plan/Jord/phase-03/done/S0047-contextual-sidebar|S0047]]\n"
)
new_impl = (
    old_impl
    + "- **Phase-03 S0048 / jord-F0023 (partial)** — right inspector host + `?inspector=` deep links; migrate/create/detail panels · [[../tech_space/jord/studio/README#right-inspector-s0048]] · card [[../plan/Jord/phase-03/done/S0048-right-inspector|S0048]]\n"
)
if old_impl not in text:
    raise SystemExit("impl block not found")
text = text.replace(old_impl, new_impl, 1)

old_prog = (
    "- **Phase-03** — **Active single-task queue**: [[../plan/Jord/phase-03/README]] — **63 cards, S0034–S0096**, waves A–P. **Wave A done** (S0034–S0041 / [[../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]]). **Wave B done** ([[../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]–[[../plan/Jord/phase-03/done/S0045-project-scoped-routes|S0045]]). **Wave C started** ([[../plan/Jord/phase-03/done/S0046-three-pane-shell|S0046]] · [[../plan/Jord/phase-03/done/S0047-contextual-sidebar|S0047]]). **Next:** [[../plan/Jord/phase-03/S0048-right-inspector|S0048]] (right inspector drawer + deep links). Open features: [[../feature_list/Jord/todo/jord-F0014-typed-dx|jord-F0014]]–[[../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]]. Feature index: [[../feature_list/Jord/INDEX]].\n"
)
new_prog = (
    "- **Phase-03** — **Active single-task queue**: [[../plan/Jord/phase-03/README]] — **63 cards, S0034–S0096**, waves A–P. **Wave A done** (S0034–S0041 / [[../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]]). **Wave B done** ([[../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]–[[../plan/Jord/phase-03/done/S0045-project-scoped-routes|S0045]]). **Wave C** ([[../plan/Jord/phase-03/done/S0046-three-pane-shell|S0046]]–[[../plan/Jord/phase-03/done/S0048-right-inspector|S0048]]). **Next:** [[../plan/Jord/phase-03/S0049-schema-scoped-introspection|S0049]] (schema-scoped introspection/DDL). Open features: [[../feature_list/Jord/todo/jord-F0014-typed-dx|jord-F0014]]–[[../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]]. Feature index: [[../feature_list/Jord/INDEX]].\n"
)
if old_prog not in text:
    raise SystemExit("progress block not found")
text = text.replace(old_prog, new_prog, 1)
p.write_text(text, encoding="utf-8", newline="\n")
print("STATUS.md updated")
