import { NotFoundException } from '@nestjs/common';
import { FilaService } from './fila.service';
import { ExecucaoEntity } from './execucao.entity';

describe('FilaService', () => {
  const rows: ExecucaoEntity[] = [];
  const repo = {
    findOne: jest.fn(({ where }: { where: { osId: string; etapa: string } }) =>
      Promise.resolve(
        rows.find(
          (row) => row.osId === where.osId && row.etapa === where.etapa,
        ) ?? null,
      ),
    ),
    find: jest.fn(({ where }: { where: { osId: string } }) =>
      Promise.resolve(rows.filter((row) => row.osId === where.osId)),
    ),
    create: jest.fn((input: ExecucaoEntity) => input),
    save: jest.fn((input: ExecucaoEntity) => {
      const index = rows.findIndex(
        (row) => row.osId === input.osId && row.etapa === input.etapa,
      );
      if (index >= 0) rows[index] = input;
      else rows.push(input);
      return Promise.resolve(input);
    }),
  };
  const service = new FilaService(repo as never);

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
