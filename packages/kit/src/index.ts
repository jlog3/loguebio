// @repo/kit: accessible building blocks shared by every LogueBio tool.
// Each view has its non-visual twin built in: charts carry a text summary,
// keyboard reading, a data table and sound; tables sort and report it.
export { LineChart, MarkerShape, type Series, type Marker, type RefLine } from "./LineChart";
export { SortableTable, type Column } from "./SortableTable";
export { Tabs, type TabDef } from "./Tabs";
export { Dialog } from "./Dialog";
export { earcon, setDrone, playSeries, pitchFor, soundSupported, type Earcon } from "./sound";
