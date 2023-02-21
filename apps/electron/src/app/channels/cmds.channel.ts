import { Channel, Path } from '@oam-kit/decorators';
import commandExists from 'command-exists';

@Channel('cmds')
export class CmdsChannel {
  @Path('/is_commands_ready')
  public isCommandsReady() {
    const commandExistsSync = commandExists.sync;
    return { svnReady: commandExistsSync('svn'), gitReady: commandExistsSync('git') };
  }
}
