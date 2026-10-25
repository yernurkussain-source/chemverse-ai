// Storage кілтінде кирилл әріптері болмайды — файл атауы base64url түрінде сақталады: <уақыт>-<атауы>.<кеңейтім>
export const encodeFileName = (name: string, now = Date.now()) => {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() : "";
  const base = Buffer.from((dot > 0 ? name.slice(0, dot) : name).slice(0, 60)).toString("base64url");
  return `${now}-${base}${ext ? `.${ext}` : ""}`;
};

/** Жолдан (user/project/<файл>) оқушыға көрінетін атау */
export const decodeFileName = (path: string) => {
  const file = path.split("/").pop() ?? "";
  const match = /^\d+-([\w-]*)(?:\.(\w+))?$/.exec(file);
  if (!match) return file;
  return `${Buffer.from(match[1], "base64url").toString("utf8")}${match[2] ? `.${match[2]}` : ""}`;
};
