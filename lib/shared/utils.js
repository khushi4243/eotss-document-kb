"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const fs = require("node:fs");
const path = require("node:path");
class Utils {
    static copyDirRecursive(sourceDir, targetDir) {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            const sourceFilePath = path.join(sourceDir, file);
            const targetFilePath = path.join(targetDir, file);
            const stats = fs.statSync(sourceFilePath);
            if (stats.isDirectory()) {
                Utils.copyDirRecursive(sourceFilePath, targetFilePath);
            }
            else {
                fs.copyFileSync(sourceFilePath, targetFilePath);
            }
        }
    }
}
exports.Utils = Utils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4QkFBOEI7QUFDOUIsa0NBQWtDO0FBRWxDLE1BQXNCLEtBQUs7SUFDekIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQWlCLEVBQUUsU0FBaUI7UUFDMUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDN0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUN6QjtRQUVELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFeEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUUxQyxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDdkIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQzthQUN4RDtpQkFBTTtnQkFDTCxFQUFFLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQzthQUNqRDtTQUNGO0lBQ0gsQ0FBQztDQUVGO0FBckJELHNCQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFV0aWxzIHtcbiAgc3RhdGljIGNvcHlEaXJSZWN1cnNpdmUoc291cmNlRGlyOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldERpcikpIHtcbiAgICAgIGZzLm1rZGlyU3luYyh0YXJnZXREaXIpO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmMoc291cmNlRGlyKTtcblxuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgY29uc3Qgc291cmNlRmlsZVBhdGggPSBwYXRoLmpvaW4oc291cmNlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHRhcmdldEZpbGVQYXRoID0gcGF0aC5qb2luKHRhcmdldERpciwgZmlsZSk7XG4gICAgICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKHNvdXJjZUZpbGVQYXRoKTtcblxuICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgVXRpbHMuY29weURpclJlY3Vyc2l2ZShzb3VyY2VGaWxlUGF0aCwgdGFyZ2V0RmlsZVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKHNvdXJjZUZpbGVQYXRoLCB0YXJnZXRGaWxlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbn1cbiJdfQ==