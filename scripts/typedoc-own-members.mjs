/**
 * TypeDoc plugin: leave out members a class inherits from outside this
 * package. `<smart-checkin-picker>` extends HTMLElement, and without this its
 * reference page lists every DOM property and method (hundreds of them) around
 * the picker's own few.
 */
import { Converter, ReflectionKind } from "typedoc";

export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    const project = context.project;
    for (const cls of project.getReflectionsByKind(ReflectionKind.Class)) {
      for (const member of [...(cls.children ?? [])]) {
        const from = member.inheritedFrom;
        if (from && !from.reflection) project.removeReflection(member);
      }
    }
  });
}
