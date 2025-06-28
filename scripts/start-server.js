const { spawn } = require("child_process")

const port = process.env.PORT || 8080

console.log(`Starting Ethan Hole frontend on port ${port}...`)

const nextProcess = spawn("next", ["dev", "-p", port.toString()], {
  stdio: "inherit",
  shell: true,
})

nextProcess.on("close", (code) => {
  console.log(`Server process exited with code ${code}`)
})

nextProcess.on("error", (error) => {
  console.error("Failed to start server:", error)
})
