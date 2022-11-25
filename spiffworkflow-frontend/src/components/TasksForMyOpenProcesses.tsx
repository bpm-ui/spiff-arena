import { useEffect, useState } from 'react';
// @ts-ignore
import { Button, Table } from '@carbon/react';
import { Link, useSearchParams } from 'react-router-dom';
import PaginationForTable from './PaginationForTable';
import {
  convertSecondsToFormattedDateTime,
  getPageInfoFromSearchParams,
  modifyProcessIdentifierForPathParam,
  refreshAtInterval,
} from '../helpers';
import HttpService from '../services/HttpService';
import { PaginationObject } from '../interfaces';
import TableCellWithTimeAgoInWords from './TableCellWithTimeAgoInWords';

const PER_PAGE_FOR_TASKS_ON_HOME_PAGE = 5;
const paginationQueryParamPrefix = 'tasks_for_my_open_processes';
const REFRESH_INTERVAL = 5;
const REFRESH_TIMEOUT = 600;

export default function MyOpenProcesses() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState<PaginationObject | null>(null);

  useEffect(() => {
    const getTasks = () => {
      const { page, perPage } = getPageInfoFromSearchParams(
        searchParams,
        PER_PAGE_FOR_TASKS_ON_HOME_PAGE,
        undefined,
        paginationQueryParamPrefix
      );
      const setTasksFromResult = (result: any) => {
        setTasks(result.results);
        setPagination(result.pagination);
      };
      HttpService.makeCallToBackend({
        path: `/tasks/for-my-open-processes?per_page=${perPage}&page=${page}`,
        successCallback: setTasksFromResult,
      });
    };
    getTasks();
    refreshAtInterval(REFRESH_INTERVAL, REFRESH_TIMEOUT, getTasks);
  }, [searchParams]);

  const buildTable = () => {
    const rows = tasks.map((row) => {
      const rowToUse = row as any;
      const taskUrl = `/tasks/${rowToUse.process_instance_id}/${rowToUse.task_id}`;
      const modifiedProcessModelIdentifier =
        modifyProcessIdentifierForPathParam(rowToUse.process_model_identifier);
      return (
        <tr key={rowToUse.id}>
          <td>
            <Link
              data-qa="process-instance-show-link"
              to={`/admin/process-models/${modifiedProcessModelIdentifier}/process-instances/${rowToUse.process_instance_id}`}
              title={`View process instance ${rowToUse.process_instance_id}`}
            >
              {rowToUse.process_instance_id}
            </Link>
          </td>
          <td>
            <Link
              data-qa="process-model-show-link"
              to={`/admin/process-models/${modifiedProcessModelIdentifier}`}
              title={rowToUse.process_model_identifier}
            >
              {rowToUse.process_model_display_name}
            </Link>
          </td>
          <td
            title={`task id: ${rowToUse.name}, spiffworkflow task guid: ${rowToUse.id}`}
          >
            {rowToUse.task_title}
          </td>
          <td>{rowToUse.group_identifier || '-'}</td>
          <td>
            {convertSecondsToFormattedDateTime(
              rowToUse.created_at_in_seconds
            ) || '-'}
          </td>
          <TableCellWithTimeAgoInWords
            timeInSeconds={rowToUse.updated_at_in_seconds}
          />
          <td>
            <Button
              variant="primary"
              href={taskUrl}
              hidden={rowToUse.process_instance_status === 'suspended'}
              disabled={!rowToUse.current_user_is_potential_owner}
            >
              Go
            </Button>
          </td>
        </tr>
      );
    });
    return (
      <Table striped bordered>
        <thead>
          <tr>
            <th>Id</th>
            <th>Process</th>
            <th>Task</th>
            <th>Waiting For</th>
            <th>Date Started</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    );
  };

  const tasksComponent = () => {
    if (pagination && pagination.total < 1) {
      return (
        <p className="no-results-message with-large-bottom-margin">
          There are no tasks for processes you started at this time.
        </p>
      );
    }
    const { page, perPage } = getPageInfoFromSearchParams(
      searchParams,
      PER_PAGE_FOR_TASKS_ON_HOME_PAGE,
      undefined,
      paginationQueryParamPrefix
    );
    return (
      <PaginationForTable
        page={page}
        perPage={perPage}
        perPageOptions={[2, PER_PAGE_FOR_TASKS_ON_HOME_PAGE, 25]}
        pagination={pagination}
        tableToDisplay={buildTable()}
        paginationQueryParamPrefix={paginationQueryParamPrefix}
        paginationClassName="with-large-bottom-margin"
      />
    );
  };

  return (
    <>
      <h2>My open instances</h2>
      <p className="data-table-description">
        These tasks are for processes you started which are not complete. You
        may not have an action to take at this time. See below for tasks waiting
        on you.
      </p>
      {tasksComponent()}
    </>
  );
}
