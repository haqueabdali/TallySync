class SyncAgentError(Exception):
    """Base exception for sync agent."""
    pass

class ConfigurationError(SyncAgentError):
    pass

class RabbitMQConnectionError(SyncAgentError):
    pass

class TallyConnectionError(SyncAgentError):
    pass

class TallyResponseError(SyncAgentError):
    pass

class XMLGenerationError(SyncAgentError):
    pass

class MessageProcessingError(SyncAgentError):
    pass