import { NotFoundException } from '@nestjs/common';
import { ExecucaoItem } from './execucao.entity';
import { ExecucaoStore } from './execucao.store';
import { FilaService } from './fila.service';

describe('FilaService', () => {
  const rows: ExecucaoItem[] = [];
  const store: ExecucaoStore = {
    findOne: (osId, etapa) =>
      Promise.resolve(
        rows.find((row) => row.osId === osId && row.etapa === etapa) ?? null,
      ),
    findByOs: (osId) =>
      Promise.resolve(rows.filter((row) => row.osId === osId)),
    save: (item) => {
      const index = rows.findIndex(
        (row) => row.osId === item.osId && row.etapa === item.etapa,
      );
      if (index >= 0) rows[index] = item;
      else rows.push(item);
      return Promise.resolve(item);
    },
    findSagaCommand: () => Promise.resolve(null),
    commitSagaCommand: () => Promise.resolve(),
  };
  const service = new FilaService(store);

  it('opens diagnosis once and completes it', async () => {
    const aberta = await service.abrir('os-1', 'DIAGNOSTICO');
    const deNovo = await service.abrir('os-1', 'DIAGNOSTICO');

    expect(aberta.status).toBe('ABERTA');
    expect(deNovo).toBe(aberta);

    const concluida = await service.concluir('os-1', 'DIAGNOSTICO');
    expect(concluida.status).toBe('CONCLUIDA');
    expect(await service.listar('os-1')).toEqual([concluida]);
  });

  it('refuses to complete a step that was not opened', async () => {
    await expect(service.concluir('os-2', 'REPARO')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
