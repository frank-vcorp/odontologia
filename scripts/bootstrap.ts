import { execSync } from "child_process";

console.log("Bootstrap Clínica Dental…");
execSync("npm run db:migrate", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
console.log("Bootstrap completado");
