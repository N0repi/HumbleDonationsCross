// // pages/api/database.js

// import fs from "fs"
// import path from "path"

// const dbFilePath = path.join(process.cwd(), "_data", "db.json")

// function readProjectsData() {
//     const rawData = fs.readFileSync(dbFilePath)
//     return JSON.parse(rawData)
// }

// function writeProjectsData(data) {
//     const jsonData = JSON.stringify(data, null, 2)
//     fs.writeFileSync(dbFilePath, jsonData)
// }

// export function addProject(project) {
//     const projectsData = readProjectsData()
//     projectsData.projects.push(project)
//     writeProjectsData(projectsData)
// }

// export function getProjectsByTitle(title) {
//     const projectsData = readProjectsData()
//     return title
//         ? projectsData.projects.filter(
//               (project) => project.title.toLowerCase() === title.toLowerCase()
//           )
//         : projectsData.projects
// }
