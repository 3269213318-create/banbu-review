# Banbu 协作后端

这是多人协作版本的数据库骨架。它把“成员标注”和“上级确认”分开保存，只有审核通过的内容进入 `corpus_entries`。

## 启用方式

1. 创建一个私有 Supabase 项目。
2. 在 SQL Editor 中运行 `schema.sql`。
3. 在 Authentication 中创建团队成员账号。
4. 给成员写入 `workspace_members`：`annotator` 是标注成员，`reviewer` 是上级审核，`admin` 是管理员。
5. 把项目 URL 和 anon key 配置到网页的云端设置中。

当前网页仍支持本地模式；未配置云端时，协作数据只保存在当前浏览器，不会影响现有稿件库。
