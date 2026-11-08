import { createRoot } from "react-dom/client";
import { OperationalApp } from "../src/operational/OperationalApp";
import "../src/styles.css";
import "../src/operational/operational.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<OperationalApp />);