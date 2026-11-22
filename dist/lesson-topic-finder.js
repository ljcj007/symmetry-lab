import {parseClassroomRoute} from './classroom-ui.js?v=20261122-zno-gamma-nac1';
import {progressionForSelection} from './lesson-progression.js?v=20261120-lesson-topic1';
import {progressionCatalogs,progressionLessons} from './lesson-progression-index.js?v=20261113-route1';

const catalogNames = new Map(progressionCatalogs.map(({catalog,title}) => [catalog,title]));
const lessonKey = ({catalog,lessonId}) => catalog+'::'+lessonId;
const topicKey = ({catalog,module,track}) => JSON.stringify([catalog,module?'module':track?'track':'catalog',module||track||null]);

/** Resolve real lesson identity and topic from the same catalogue used by the
 * classroom. This does not use broad URL paths or a bare lesson slug as a key. */
export function lessonTopicForRoute(route) {
  if (typeof route !== 'string' || !/^#?classroom\/[a-z0-9_/?=&.%+-]+$/i.test(route)) return null;
  const selection = parseClassroomRoute(route);
  if (!selection || selection.calculationOnly || selection.embeddedOnly || selection.atlasOnly) return null;
  const lesson = progressionForSelection(selection).current;
  if (!lesson) return null;
  const current = lessonKey(lesson), topic = topicKey(lesson);
  const rows = progressionLessons.map(item => ({
    route:item.route.replace(/^#/,''),
    title:item.title,
    summary:'',
    topicLabel:catalogNames.get(item.catalog),
    keywords:item.lessonId.replaceAll('-',' '),
    kind:'课程',
    current:lessonKey(item)===current,
    topic:topicKey(item)===topic,
    catalog:item.catalog===lesson.catalog,
  }));
  return {current,title:lesson.title,catalogTitle:catalogNames.get(lesson.catalog),
    topic:rows.filter(row=>row.topic),catalog:rows.filter(row=>row.catalog),all:rows};
}
