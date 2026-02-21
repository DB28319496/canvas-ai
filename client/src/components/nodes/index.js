import TextNode from './TextNode.jsx';
import ImageNode from './ImageNode.jsx';
import PdfNode from './PdfNode.jsx';
import YouTubeNode from './YouTubeNode.jsx';
import VoiceNode from './VoiceNode.jsx';
import WebNode from './WebNode.jsx';
import GroupNode from './GroupNode.jsx';
import CodeNode from './CodeNode.jsx';
import StickyNode from './StickyNode.jsx';
import EmbedNode from './EmbedNode.jsx';

// Register all custom node types for React Flow
export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  pdf: PdfNode,
  youtube: YouTubeNode,
  voice: VoiceNode,
  web: WebNode,
  group: GroupNode,
  code: CodeNode,
  sticky: StickyNode,
  embed: EmbedNode
};
