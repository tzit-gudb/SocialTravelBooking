import fs from "fs";
import { execSync } from "child_process";

const OWNER = "tranhoangviet05";
const REPO = "ProjectManagement";
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}`;

const isDryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// 1. Get Auth Token
let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  try {
    token = execSync("gh auth token", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch (e) {
    // No gh token
  }
}

if (!token && !isDryRun) {
  console.error(
    'Error: GITHUB_TOKEN or gh CLI login is required. Run "gh auth login" or pass GITHUB_TOKEN=...',
  );
  process.exit(1);
}

// 2. HTTP Helper
async function ghRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = typeof data === "object" ? JSON.stringify(data) : data;
    throw new Error(`GitHub API Error [${res.status}] ${res.statusText}: ${errorMsg}`);
  }

  return data;
}

// 3. Parse ROADMAP.md
function parseRoadmap(filePath = "ROADMAP.md") {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const sprints = [];
  let currentSprint = null;
  let currentEpic = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();

    const sprintMatch = line.match(/^## SPRINT (\d+):\s*(.+?)\s*\(Tuần \d+\)/);
    if (sprintMatch) {
      currentSprint = {
        num: parseInt(sprintMatch[1]),
        title: `Sprint ${sprintMatch[1]}: ${sprintMatch[2].trim()}`,
        epics: [],
      };
      sprints.push(currentSprint);
      currentEpic = null;
      continue;
    }

    const timeMatch = line.match(/\*\*Thời gian:\*\*\s*(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})/);
    if (timeMatch && currentSprint) {
      currentSprint.time = { start: timeMatch[1], end: timeMatch[2] };
      continue;
    }

    const goalMatch = line.match(/\*\*Mục tiêu.*:\*\*\s*(.+)/);
    if (goalMatch && currentSprint) {
      currentSprint.goal = goalMatch[1].trim();
      continue;
    }

    const epicMatch = line.match(
      /^\|\s*\*\*\[EPIC\]\s*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/,
    );
    if (epicMatch && currentSprint) {
      currentEpic = {
        title: `[EPIC] ${epicMatch[1].trim()}`,
        platform: epicMatch[2].trim(),
        status: epicMatch[3].trim(),
        priority: epicMatch[4].trim(),
        estimate: epicMatch[5].trim(),
        module: epicMatch[6].trim(),
        role: epicMatch[7].trim(),
        startDate: epicMatch[8].trim(),
        targetDate: epicMatch[9].trim(),
        tasks: [],
      };
      currentSprint.epics.push(currentEpic);
      continue;
    }

    const taskMatch = line.match(
      /^\|\s*↳\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/,
    );
    if (taskMatch && currentEpic) {
      currentEpic.tasks.push({
        title: taskMatch[1].trim(),
        platform: taskMatch[2].trim(),
        status: taskMatch[3].trim(),
        priority: taskMatch[4].trim(),
        estimate: taskMatch[5].trim(),
        module: taskMatch[6].trim(),
        role: taskMatch[7].trim(),
        startDate: taskMatch[8].trim(),
        targetDate: taskMatch[9].trim(),
      });
    }
  }

  return sprints;
}

// 4. Main Sync Logic
async function main() {
  console.log(`Bắt đầu đồng bộ ROADMAP lên GitHub [${OWNER}/${REPO}]...`);
  if (isDryRun) {
    console.log(`[DRY-RUN MODE] Chạy mô phỏng, không ghi dữ liệu thực tế lên GitHub.\n`);
  }

  const sprints = parseRoadmap();
  console.log(`Đã đọc ${sprints.length} Sprints từ ROADMAP.md.\n`);

  if (isDryRun) {
    for (const sprint of sprints) {
      console.log(`=== ${sprint.title} (${sprint.time?.start} - ${sprint.time?.end}) ===`);
      console.log(`Goal: ${sprint.goal || "N/A"}`);
      for (const epic of sprint.epics) {
        console.log(` ${epic.title} [Priority: ${epic.priority} | Est: ${epic.estimate} pts]`);
        for (const task of epic.tasks) {
          console.log(
            `     ↳ Task: ${task.title} [Platform: ${task.platform} | Module: ${task.module} | Priority: ${task.priority}]`,
          );
        }
      }
      console.log("");
    }
    console.log(`[DRY-RUN] Hoàn tất mô phỏng.`);
    return;
  }

  // A. Fetch existing Milestones
  console.log("Kiểm tra Milestones (Sprints) hiện có...");
  const existingMilestones = await ghRequest("/milestones?state=all&per_page=100");
  const milestoneMap = new Map();
  for (const m of existingMilestones) {
    milestoneMap.set(m.title, m.number);
  }

  // Create Milestones
  for (const sprint of sprints) {
    if (!milestoneMap.has(sprint.title)) {
      console.log(`Đang tạo Milestone: "${sprint.title}"...`);
      // Year 2026 based on project context
      const [endDay, endMonth] = (sprint.time?.end || "01/11").split("/");
      const dueOn = `2026-${endMonth.padStart(2, "0")}-${endDay.padStart(2, "0")}T23:59:59Z`;

      const newM = await ghRequest("/milestones", {
        method: "POST",
        body: JSON.stringify({
          title: sprint.title,
          description: sprint.goal ? `Mục tiêu Sprint: ${sprint.goal}` : "",
          due_on: dueOn,
          state: "open",
        }),
      });
      milestoneMap.set(sprint.title, newM.number);
    } else {
      console.log(`Đã tồn tại Milestone: "${sprint.title}"`);
    }
  }

  // B. Setup Labels
  console.log("\nKiểm tra & Khởi tạo Labels...");
  const standardLabels = [
    { name: "type: epic", color: "5319E7", description: "Epic bao quát các subtasks" },
    { name: "type: task", color: "1D76DB", description: "Task cụ thể trong Sprint" },
    { name: "P0: Critical", color: "B60205", description: "Ưu tiên khẩn cấp" },
    { name: "P1: High", color: "D93F0B", description: "Ưu tiên cao" },
    { name: "P2: Normal", color: "FBCA04", description: "Ưu tiên bình thường" },
    { name: "P3: Nice-to-have", color: "0E8A16", description: "Tính năng bổ sung" },
    { name: "module: Auth", color: "0075CA", description: "Module Xác thực & Tài khoản" },
    { name: "module: Booking", color: "0052CC", description: "Module Đặt chỗ & Lịch trình" },
    { name: "module: Payment", color: "0E8A16", description: "Module Cổng thanh toán & Ví" },
    { name: "module: Social", color: "E99695", description: "Module Mạng xã hội du lịch" },
    { name: "module: Admin", color: "BFDADC", description: "Module Quản trị hệ thống" },
    { name: "module: DevOps", color: "BFD4F2", description: "Module Hạ tầng & CI/CD" },
    { name: "platform: API", color: "C5DEF5", description: "Laravel Backend API" },
    { name: "platform: Web", color: "D4C5F9", description: "Frontend React / Next Web" },
    { name: "platform: Mobile", color: "BFDADC", description: "React Native / Expo Mobile" },
    { name: "platform: All", color: "FEF2C0", description: "Toàn bộ nền tảng" },
  ];

  const existingLabels = await ghRequest("/labels?per_page=100");
  const existingLabelNames = new Set(existingLabels.map((l) => l.name.toLowerCase()));

  for (const label of standardLabels) {
    if (!existingLabelNames.has(label.name.toLowerCase())) {
      try {
        await ghRequest("/labels", {
          method: "POST",
          body: JSON.stringify(label),
        });
        console.log(`Tạo label: ${label.name}`);
      } catch (err) {
        // Label might already exist
      }
    }
  }

  // C. Fetch existing Issues to avoid duplicates
  console.log("\nKiểm tra Issues hiện có...");
  const existingIssues = await ghRequest("/issues?state=all&per_page=100");
  const issueMap = new Map();
  for (const iss of existingIssues) {
    issueMap.set(iss.title.trim().toLowerCase(), iss);
  }

  // D. Create Epics & Tasks
  for (const sprint of sprints) {
    const milestoneNumber = milestoneMap.get(sprint.title);

    for (const epic of sprint.epics) {
      console.log(`\nXử lý Epic: "${epic.title}"`);
      let epicIssue = issueMap.get(epic.title.toLowerCase());

      if (!epicIssue) {
        const epicBody = `## Mục tiêu Epic\n${epic.title} thuộc **${sprint.title}**.\n\n### Danh sách Task triển khai\n`;
        const epicLabels = [
          "type: epic",
          `${epic.priority}: Critical`,
          `module: ${epic.module}`,
        ].filter(Boolean);

        epicIssue = await ghRequest("/issues", {
          method: "POST",
          body: JSON.stringify({
            title: epic.title,
            body: epicBody,
            milestone: milestoneNumber,
            labels: epicLabels,
          }),
        });
        console.log(`  Đã tạo Epic Issue #${epicIssue.number}: "${epic.title}"`);
        issueMap.set(epic.title.toLowerCase(), epicIssue);
      } else {
        console.log(`Epic Issue #${epicIssue.number} đã tồn tại.`);
      }

      // Create Subtasks
      const taskChecklist = [];
      for (const task of epic.tasks) {
        let taskIssue = issueMap.get(task.title.toLowerCase());

        if (!taskIssue) {
          const taskBody =
            `### Mô tả Task\nTask nằm trong Epic: #${epicIssue.number} (${epic.title})\n\n` +
            `* **Sprint:** ${sprint.title}\n` +
            `* **Platform:** ${task.platform}\n` +
            `* **Module:** ${task.module}\n` +
            `* **Role:** ${task.role}\n` +
            `* **Story Points (Estimate):** ${task.estimate} pts\n` +
            `* **Dự kiến hoàn thành:** ${task.startDate} -> ${task.targetDate}\n`;

          const taskLabels = [
            "type: task",
            `${task.priority}: ${task.priority === "P0" ? "Critical" : task.priority === "P1" ? "High" : "Normal"}`,
            `module: ${task.module}`,
            `platform: ${task.platform}`,
          ].filter(Boolean);

          taskIssue = await ghRequest("/issues", {
            method: "POST",
            body: JSON.stringify({
              title: task.title,
              body: taskBody,
              milestone: milestoneNumber,
              labels: taskLabels,
            }),
          });
          console.log(`    ↳ Tạo Task Issue #${taskIssue.number}: "${task.title}"`);
          issueMap.set(task.title.toLowerCase(), taskIssue);
        } else {
          console.log(`    ↳ Task Issue #${taskIssue.number} đã tồn tại.`);
        }

        taskChecklist.push(
          `- [ ] #${taskIssue.number} ${task.title} (Est: ${task.estimate} pts, ${task.platform})`,
        );
      }

      // Update Epic Issue Body with Task Checklist
      if (taskChecklist.length > 0) {
        const updatedBody = `## Mục tiêu Epic\n${epic.title} thuộc **${sprint.title}**.\n\n### 📋 Danh sách Task triển khai\n${taskChecklist.join("\n")}\n`;
        await ghRequest(`/issues/${epicIssue.number}`, {
          method: "PATCH",
          body: JSON.stringify({ body: updatedBody }),
        });
        console.log(
          `  Đã liên kết ${taskChecklist.length} sub-tasks vào Epic Issue #${epicIssue.number}`,
        );
      }
    }
  }

  console.log("\n ĐỒNG BỘ THÀNH CÔNG TOÀN BỘ SPRINT, EPIC VÀ TASK LÊN GITHUB!");
}

main().catch((err) => {
  console.error("\n Có lỗi xảy ra trong quá trình đồng bộ:", err.message);
  process.exit(1);
});
