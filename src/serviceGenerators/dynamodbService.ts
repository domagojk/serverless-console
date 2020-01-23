import { Service } from '../extension'

export async function dynamoDbService(service: Service): Promise<Service> {
  return {
    ...service,
    items: [
      {
        title: 'tablename'
      }
    ]
  }
}
