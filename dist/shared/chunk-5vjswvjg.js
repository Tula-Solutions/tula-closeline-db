import { createRequire } from "node:module";
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/schema/index.ts
var exports_schema = {};
__export(exports_schema, {
  authSchema: () => authSchema2,
  coreSchema: () => coreSchema2,
  playbookSchema: () => playbookSchema2
});

// src/schema/auth.ts
import { pgSchema } from "drizzle-orm/pg-core";
var authSchema2 = pgSchema("auth");
// src/schema/core.ts
import { pgSchema as pgSchema2 } from "drizzle-orm/pg-core";
var coreSchema2 = pgSchema2("core");
// src/schema/playbook.ts
import { pgSchema as pgSchema3 } from "drizzle-orm/pg-core";
var playbookSchema2 = pgSchema3("playbook");
export { authSchema2, coreSchema2, playbookSchema2, exports_schema };
