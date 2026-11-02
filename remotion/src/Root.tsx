import { Composition, Folder } from 'remotion';
import { PortfolioShowreel } from './PortfolioShowreel';
import { OpeningScene } from './scenes/OpeningScene';
import { TimepieceScene } from './scenes/TimepieceScene';
import { FaroScene } from './scenes/FaroScene';
import { EgyptScene } from './scenes/EgyptScene';
import { WordflowScene } from './scenes/WordflowScene';
import { FinaleScene } from './scenes/FinaleScene';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="PortfolioShowreel" component={PortfolioShowreel} durationInFrames={660} fps={30} width={1920} height={1080} />
      <Folder name="Scenes">
        <Composition id="Opening" component={OpeningScene} durationInFrames={90} fps={30} width={1920} height={1080} />
        <Composition id="Timepiece" component={TimepieceScene} durationInFrames={120} fps={30} width={1920} height={1080} />
        <Composition id="Faro" component={FaroScene} durationInFrames={120} fps={30} width={1920} height={1080} />
        <Composition id="Egypt" component={EgyptScene} durationInFrames={120} fps={30} width={1920} height={1080} />
        <Composition id="Wordflow" component={WordflowScene} durationInFrames={120} fps={30} width={1920} height={1080} />
        <Composition id="Finale" component={FinaleScene} durationInFrames={90} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
