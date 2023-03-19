import { Module } from '@oam-kit/decorators';
import { AuthChannel } from './channels/auth.channel';
import { CmdsChannel } from './channels/cmds.channel';
import { FileChannel } from './channels/file.channel';
import { ServerChannel } from './channels/server.channel';
import { StorageChannel } from './channels/storage.channel';
import { SyncCodeChannel } from './channels/sync-code/sync-code.channel';
import { KnifeGeneratorChannel } from './channels/knife-generator.channel';
import { StoreService } from './services/store.service';
import { ZipParserChannel } from './channels/zip-parser/zip-parser.channel';

@Module({
  channels: [
    StorageChannel,
    AuthChannel,
    CmdsChannel,
    FileChannel,
    ServerChannel,
    SyncCodeChannel,
    KnifeGeneratorChannel,
    ZipParserChannel,
  ],
  providers: [StoreService],
})
export class AppModule {}
